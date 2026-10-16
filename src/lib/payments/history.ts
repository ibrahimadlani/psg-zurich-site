import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { orders, paymentItems, payments, refunds } from "@/db/schema";

/** A member's payments that went through (or are on their way), newest first, with what they paid for. */
export async function memberPayments(memberId: string) {
  const rows = await db
    .select()
    .from(payments)
    .where(and(eq(payments.memberId, memberId), inArray(payments.status, ["succeeded", "processing", "refunded", "partially_refunded"])))
    .orderBy(desc(payments.createdAt));
  if (rows.length === 0) return [];
  const ids = rows.map((row) => row.id);
  const [items, refundRows, orderRows] = await Promise.all([
    db.select().from(paymentItems).where(inArray(paymentItems.paymentId, ids)),
    db.select().from(refunds).where(and(inArray(refunds.paymentId, ids), eq(refunds.status, "succeeded"))),
    db.select().from(orders).where(inArray(orders.paymentId, ids)),
  ]);
  return rows.map((payment) => ({
    ...payment,
    items: items.filter((item) => item.paymentId === payment.id),
    refunds: refundRows.filter((refund) => refund.paymentId === payment.id),
    order: orderRows.find((order) => order.paymentId === payment.id) ?? null,
  }));
}
