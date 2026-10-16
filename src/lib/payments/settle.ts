import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ledgerEntries, paymentItems, payments, type LedgerAccount, type PaymentMethod } from "@/db/schema";
import { writeAuditLog } from "@/lib/audit";
import { todayInZurich } from "@/lib/dues";
import { fiscalYearOf } from "@/lib/money";
import { afterPayment } from "@/lib/payments/after-payment";
import { settleShop } from "@/lib/payments/shop";
import { formatPaymentReference } from "@/lib/payments/config";
import { documentNumber, nextNumber } from "@/lib/payments/numbering";
import { stripe, type Stripe } from "@/lib/payments/stripe";

/** Which account of the books each kind of line goes to. */
const ACCOUNT: Record<(typeof paymentItems.$inferSelect)["type"], LedgerAccount> = {
  dues: "dues",
  product: "shop",
  shipping: "shipping",
  donation: "donations",
};

type Settlement = {
  method: PaymentMethod;
  cardBrand?: string | null;
  cardLast4?: string | null;
  chargeId?: string | null;
  /** Provider fee, when the money went through the provider. */
  fee?: number | null;
  /** Committee member who recorded a manual payment; null for online payments. */
  actorId: string | null;
  ipAddress?: string | null;
  note?: string | null;
};

/**
 * The money is in: one transaction marks the payment paid, gives it its receipt number and
 * writes its lines (and the fee) in the books, with an audit line. Safe to call twice (the
 * webhook and the payer's page can both get there first): the second call does nothing.
 * Returns true when this call settled the payment.
 */
export async function settle(paymentId: string, settlement: Settlement) {
  const today = todayInZurich();
  const settled = await db.transaction(async (tx) => {
    const [payment] = await tx.select().from(payments).where(eq(payments.id, paymentId)).for("update");
    if (!payment || payment.status === "succeeded" || payment.status === "refunded" || payment.status === "partially_refunded") return null;
    const items = await tx.select().from(paymentItems).where(eq(paymentItems.paymentId, paymentId));

    const year = Number(today.slice(0, 4));
    const receiptNumber = documentNumber("Q", year, await nextNumber(tx, "Q", year));
    const fee = settlement.fee ?? null;
    await tx
      .update(payments)
      .set({
        status: "succeeded",
        method: settlement.method,
        cardBrand: settlement.cardBrand ?? null,
        cardLast4: settlement.cardLast4 ?? null,
        stripeChargeId: settlement.chargeId ?? null,
        feeAmount: fee,
        netAmount: fee === null ? null : payment.amount - fee,
        receiptNumber,
        paidAt: new Date(),
        createdById: settlement.actorId,
        note: settlement.note ?? payment.note,
      })
      .where(eq(payments.id, paymentId));

    const reference = formatPaymentReference(payment.reference);
    const fiscalYear = fiscalYearOf(today);
    await tx.insert(ledgerEntries).values([
      ...items.map((item) => ({
        date: today,
        fiscalYear,
        account: ACCOUNT[item.type],
        amount: item.total,
        description: `${receiptNumber} · ${reference} · ${item.description}`,
        paymentId,
      })),
      ...(fee ? [{ date: today, fiscalYear, account: "stripe_fees" as const, amount: -fee, description: `${receiptNumber} · ${reference} · fees`, paymentId }] : []),
    ]);
    // Shop: the pieces leave the stock and the order counts as paid, with the payment.
    if (payment.kind === "shop") await settleShop(tx, paymentId);
    await writeAuditLog(
      {
        actorId: settlement.actorId,
        action: "payment.succeeded",
        entityType: "payment",
        entityId: paymentId,
        metadata: { reference, receiptNumber, kind: payment.kind, amount: payment.amount, method: settlement.method, fee },
        ipAddress: settlement.ipAddress ?? null,
      },
      tx,
    );
    return { ...payment, receiptNumber };
  });
  if (!settled) return false;

  // Receipt, what the payment pays for, emails. Each step is safe to run again.
  await afterPayment(paymentId, { actorId: settlement.actorId, ipAddress: settlement.ipAddress ?? null });
  return true;
}

/** How a provider payment was made, read from its charge. */
function settlementOf(intent: Stripe.PaymentIntent): Settlement {
  const charge = typeof intent.latest_charge === "object" ? intent.latest_charge : null;
  const details = charge?.payment_method_details;
  const card = details?.card;
  const wallet = card?.wallet?.type;
  const balance = charge && typeof charge.balance_transaction === "object" ? charge.balance_transaction : null;
  return {
    method: details?.type === "twint" ? "twint" : wallet === "apple_pay" ? "apple_pay" : wallet === "google_pay" ? "google_pay" : "card",
    cardBrand: card?.brand ?? null,
    cardLast4: card?.last4 ?? null,
    chargeId: charge?.id ?? null,
    fee: balance?.fee ?? null,
    actorId: null,
  };
}

/**
 * Brings our payment in line with the provider's payment intent (webhook, or the payer's
 * page asking for news). Returns the payment's status afterwards.
 */
export async function syncPaymentIntent(intentOrId: Stripe.PaymentIntent | string) {
  const id = typeof intentOrId === "string" ? intentOrId : intentOrId.id;
  const intent = await stripe().paymentIntents.retrieve(id, { expand: ["latest_charge.balance_transaction"] });
  const paymentId = intent.metadata.paymentId;
  if (!paymentId) return null;
  if (intent.status === "succeeded") {
    await settle(paymentId, settlementOf(intent));
  } else if (intent.status === "processing") {
    await db.update(payments).set({ status: "processing" }).where(eq(payments.id, paymentId));
  } else if (intent.status === "canceled") {
    await db.update(payments).set({ status: "canceled" }).where(eq(payments.id, paymentId));
  } else if (intent.status === "requires_payment_method" && intent.last_payment_error) {
    // Declined: the payer can try again with the same payment.
    await db.update(payments).set({ status: "failed" }).where(eq(payments.id, paymentId));
  }
  const [payment] = await db.select({ status: payments.status }).from(payments).where(eq(payments.id, paymentId));
  return payment?.status ?? null;
}
