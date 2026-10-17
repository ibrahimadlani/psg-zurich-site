import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { ledgerEntries, payments, refunds } from "@/db/schema";
import { writeAuditLog } from "@/lib/audit";
import { todayInZurich } from "@/lib/dues";
import { recordDues } from "@/lib/dues-record";
import { enqueue } from "@/lib/mailing/queue";
import { fiscalYearOf, formatChf } from "@/lib/money";
import { payerRecipient } from "@/lib/payments/after-payment";
import { formatPaymentReference } from "@/lib/payments/config";
import { documentNumber, nextNumber } from "@/lib/payments/numbering";
import { ensureCreditNote } from "@/lib/payments/receipts";
import { stripe } from "@/lib/payments/stripe";
import { HttpError } from "@/lib/permissions";

const ONLINE = new Set(["card", "twint", "apple_pay", "google_pay"]);

/**
 * Gives money back (all or part of a payment). Online payments are refunded through the
 * provider, which confirms later (webhook) or at once; money paid by hand was given back by
 * hand, so its refund is settled right away. Each refund gets its credit note.
 */
export async function refundPayment({ paymentId, amount, reason, actorId, ipAddress }: { paymentId: string; amount: number; reason: string; actorId: string; ipAddress: string | null }) {
  const [payment] = await db.select().from(payments).where(eq(payments.id, paymentId));
  if (!payment || !["succeeded", "partially_refunded"].includes(payment.status)) throw new HttpError(409, "not_refundable", "Only paid payments can be refunded.");
  const [pending] = await db
    .select({ total: sql<number>`coalesce(sum(${refunds.amount}), 0)` })
    .from(refunds)
    .where(and(eq(refunds.paymentId, paymentId), eq(refunds.status, "pending")));
  const left = payment.amount - payment.refundedAmount - Number(pending?.total ?? 0);
  if (amount < 1 || amount > left) throw new HttpError(400, "invalid_amount", `At most ${left} can be refunded.`);

  const id = crypto.randomUUID();
  await db.insert(refunds).values({ id, paymentId, amount, reason, createdById: actorId });
  await writeAuditLog({ actorId, action: "refund.requested", entityType: "payment", entityId: paymentId, metadata: { refundId: id, amount, reason }, ipAddress });

  if (payment.method && ONLINE.has(payment.method) && payment.stripePaymentIntentId) {
    try {
      const refund = await stripe().refunds.create(
        { payment_intent: payment.stripePaymentIntentId, amount, metadata: { refundId: id, paymentId } },
        { idempotencyKey: `refund:${id}` },
      );
      await db.update(refunds).set({ stripeRefundId: refund.id }).where(eq(refunds.id, id));
      if (refund.status === "succeeded") await settleRefund(id, { actorId, ipAddress });
      else if (refund.status === "failed" || refund.status === "canceled") await failRefund(id, refund.failure_reason ?? refund.status);
    } catch (error) {
      await failRefund(id, error instanceof Error ? error.message : String(error));
      throw new HttpError(502, "refund_failed", "The refund was refused by the payment provider.");
    }
  } else {
    await settleRefund(id, { actorId, ipAddress });
  }
  const [row] = await db.select().from(refunds).where(eq(refunds.id, id));
  return row!;
}

async function failRefund(refundId: string, why: string) {
  await db.update(refunds).set({ status: "failed" }).where(eq(refunds.id, refundId));
  await writeAuditLog({ actorId: null, action: "refund.failed", entityType: "refund", entityId: refundId, metadata: { why: why.slice(0, 200) }, ipAddress: null });
}

/**
 * The money went back: the refund gets its credit note number, the payment its new state, the
 * books a reversing line — one transaction, safe to call twice. Then the credit note, the email,
 * and what the refund undoes (the fee, an order).
 */
export async function settleRefund(refundId: string, actor: { actorId: string | null; ipAddress: string | null } = { actorId: null, ipAddress: null }) {
  const today = todayInZurich();
  const done = await db.transaction(async (tx) => {
    const [refund] = await tx.select().from(refunds).where(eq(refunds.id, refundId)).for("update");
    if (!refund || refund.status === "succeeded") return null;
    const [payment] = await tx.select().from(payments).where(eq(payments.id, refund.paymentId)).for("update");
    if (!payment) return null;
    const year = Number(today.slice(0, 4));
    const creditNoteNumber = documentNumber("A", year, await nextNumber(tx, "A", year));
    const refunded = payment.refundedAmount + refund.amount;
    await tx.update(refunds).set({ status: "succeeded", creditNoteNumber }).where(eq(refunds.id, refundId));
    await tx
      .update(payments)
      .set({ refundedAmount: refunded, status: refunded >= payment.amount ? "refunded" : "partially_refunded" })
      .where(eq(payments.id, payment.id));
    await tx.insert(ledgerEntries).values({
      date: today,
      fiscalYear: fiscalYearOf(today),
      account: "refunds",
      amount: -refund.amount,
      description: `${creditNoteNumber} · ${payment.receiptNumber ?? formatPaymentReference(payment.reference)} · ${refund.reason}`.slice(0, 255),
      paymentId: payment.id,
      refundId,
    });
    await writeAuditLog(
      { actorId: actor.actorId, action: "refund.succeeded", entityType: "payment", entityId: payment.id, metadata: { refundId, creditNoteNumber, amount: refund.amount }, ipAddress: actor.ipAddress },
      tx,
    );
    return { refund: { ...refund, creditNoteNumber }, payment: { ...payment, refundedAmount: refunded } };
  });
  if (!done) return false;
  const { refund, payment } = done;

  try {
    await ensureCreditNote(refundId);
  } catch (error) {
    console.error("[payments] credit note failed", refund.creditNoteNumber, error);
  }
  await enqueue("payment.refunded", [await payerRecipient(payment)], () => ({
    values: { amount: formatChf(refund.amount), receipt: refund.creditNoteNumber, payment: formatPaymentReference(payment.reference) },
    path: payment.memberId ? "/member/payments" : undefined,
    attachment: refund.creditNoteNumber,
    dedupe: `payment.refunded:${refundId}`,
  }));
  // A fee given back in full: the member is no longer paid up.
  if (payment.kind === "dues" && payment.memberId && payment.refundedAmount >= payment.amount) {
    await recordDues({ memberIds: [payment.memberId], paid: false, actorId: actor.actorId, ipAddress: actor.ipAddress });
  }
  if (payment.kind === "shop") {
    const { onShopRefund } = await import("@/lib/payments/shop");
    await onShopRefund(payment.id, payment.refundedAmount >= payment.amount);
  }
  return true;
}

/** Provider news about a refund (webhook): settles or fails ours. */
export async function syncRefund(stripeRefund: { id: string; status: string | null; metadata?: Record<string, string> | null; failure_reason?: string | null }) {
  const [refund] = await db.select().from(refunds).where(eq(refunds.stripeRefundId, stripeRefund.id));
  const id = refund?.id ?? stripeRefund.metadata?.refundId;
  if (!id) return;
  if (stripeRefund.status === "succeeded") await settleRefund(id);
  else if (stripeRefund.status === "failed" || stripeRefund.status === "canceled") await failRefund(id, stripeRefund.failure_reason ?? stripeRefund.status);
}
