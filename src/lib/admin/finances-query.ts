import "server-only";
import { and, desc, eq, inArray, like, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { auditLog, ledgerEntries, orders, paymentItems, payments, refunds, stripeEvents, stripePayouts, user, type OrderStatus, type PaymentKind, type PaymentState } from "@/db/schema";
import { parsePaymentReference } from "@/lib/payments/config";

export type PaymentFilters = { kind?: PaymentKind; status?: "all" | "paid" | "refunds" | "open"; q?: string };

/** Payments for the committee, newest first; abandoned (cancelled) checkouts are left out. */
export async function listPayments(filters: PaymentFilters = {}) {
  const where: SQL[] = [];
  if (filters.kind) where.push(eq(payments.kind, filters.kind));
  const states: PaymentState[] =
    filters.status === "refunds"
      ? ["refunded", "partially_refunded"]
      : filters.status === "open"
        ? ["pending", "processing", "failed"]
        : filters.status === "all"
          ? ["succeeded", "processing", "refunded", "partially_refunded", "pending", "failed"]
          : ["succeeded", "processing", "refunded", "partially_refunded"];
  where.push(inArray(payments.status, states));
  const q = filters.q?.trim();
  if (q) {
    const reference = parsePaymentReference(q);
    const pattern = `%${q}%`;
    where.push(or(like(payments.payerName, pattern), like(payments.payerEmail, pattern), like(payments.receiptNumber, pattern), ...(reference !== null ? [eq(payments.reference, reference)] : []))!);
  }
  return db
    .select({
      id: payments.id,
      reference: payments.reference,
      kind: payments.kind,
      status: payments.status,
      amount: payments.amount,
      refundedAmount: payments.refundedAmount,
      method: payments.method,
      cardBrand: payments.cardBrand,
      cardLast4: payments.cardLast4,
      payerName: payments.payerName,
      anonymous: payments.anonymous,
      receiptNumber: payments.receiptNumber,
      paidAt: payments.paidAt,
      createdAt: payments.createdAt,
    })
    .from(payments)
    .where(and(...where))
    .orderBy(desc(payments.createdAt))
    .limit(300);
}

/** Everything about one payment: lines, refunds, its books, the provider's events and the audit trail. */
export async function paymentDetail(id: string) {
  const [payment] = await db
    .select({ payment: payments, recordedBy: user.name })
    .from(payments)
    .leftJoin(user, eq(user.id, payments.createdById))
    .where(eq(payments.id, id));
  if (!payment) return null;
  const intent = payment.payment.stripePaymentIntentId;
  const [items, refundRows, entries, events, trail, order] = await Promise.all([
    db.select().from(paymentItems).where(eq(paymentItems.paymentId, id)),
    db.select({ refund: refunds, by: user.name }).from(refunds).leftJoin(user, eq(user.id, refunds.createdById)).where(eq(refunds.paymentId, id)).orderBy(desc(refunds.createdAt)),
    db.select().from(ledgerEntries).where(eq(ledgerEntries.paymentId, id)).orderBy(ledgerEntries.createdAt),
    intent
      ? db
          .select({ id: stripeEvents.id, type: stripeEvents.type, receivedAt: stripeEvents.receivedAt, processedAt: stripeEvents.processedAt, error: stripeEvents.error })
          .from(stripeEvents)
          .where(like(sql`cast(${stripeEvents.payload} as char)`, `%${intent}%`))
          .orderBy(stripeEvents.receivedAt)
          .limit(30)
      : [],
    db.select({ log: auditLog, actor: user.name }).from(auditLog).leftJoin(user, eq(user.id, auditLog.actorId)).where(and(eq(auditLog.entityType, "payment"), eq(auditLog.entityId, id))).orderBy(auditLog.createdAt),
    db.select().from(orders).where(eq(orders.paymentId, id)).then((rows) => rows[0] ?? null),
  ]);
  return { ...payment, items, refunds: refundRows, entries, events, trail, order };
}

/** Orders of the shop by state (paid first: they wait for the committee). */
export async function listOrders(statuses: OrderStatus[] = ["paid", "ready", "handed_over", "shipped"]) {
  const rows = await db
    .select({ order: orders, payment: payments })
    .from(orders)
    .innerJoin(payments, eq(payments.id, orders.paymentId))
    .where(inArray(orders.status, statuses))
    .orderBy(desc(payments.paidAt))
    .limit(200);
  if (rows.length === 0) return [];
  const items = await db.select().from(paymentItems).where(inArray(paymentItems.paymentId, rows.map((row) => row.payment.id)));
  return rows.map(({ order, payment }) => ({
    ...order,
    reference: payment.reference,
    payerName: payment.payerName,
    payerEmail: payment.payerEmail,
    amount: payment.amount,
    paidAt: payment.paidAt,
    items: items.filter((item) => item.paymentId === payment.id && item.type === "product"),
  }));
}

/** Orders still to prepare (badge of the Finances section). */
export async function ordersToPrepare() {
  const [row] = await db.select({ value: sql<number>`count(*)` }).from(orders).where(eq(orders.status, "paid"));
  return Number(row?.value ?? 0);
}

export async function listPayouts() {
  const rows = await db.select().from(stripePayouts).orderBy(desc(stripePayouts.arrivalDate)).limit(100);
  if (rows.length === 0) return [];
  const counts = await db
    .select({ payoutId: payments.payoutId, count: sql<number>`count(*)`, gross: sql<string>`sum(${payments.amount})` })
    .from(payments)
    .where(inArray(payments.payoutId, rows.map((row) => row.id)))
    .groupBy(payments.payoutId);
  return rows.map((row) => {
    const match = counts.find((item) => item.payoutId === row.id);
    return { ...row, payments: Number(match?.count ?? 0), gross: Number(match?.gross ?? 0) };
  });
}

export async function payoutPayments(payoutId: string) {
  return db
    .select({ id: payments.id, reference: payments.reference, receiptNumber: payments.receiptNumber, payerName: payments.payerName, amount: payments.amount, feeAmount: payments.feeAmount, netAmount: payments.netAmount, paidAt: payments.paidAt })
    .from(payments)
    .where(eq(payments.payoutId, payoutId))
    .orderBy(desc(payments.paidAt));
}
