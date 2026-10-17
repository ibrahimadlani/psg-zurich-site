import "server-only";
import { and, asc, desc, eq, inArray, like, ne } from "drizzle-orm";
import { db } from "@/db";
import { auditLog, events, orders, paymentItems, payments, productVariants, products, refunds } from "@/db/schema";

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

/**
 * A member's shop orders, newest first: the pieces, how they get them (event or post) and when
 * each step happened (paid, ready or shipped, handed over), read from the order's trail.
 */
export async function memberOrders(memberId: string) {
  const rows = await db
    .select({ order: orders, payment: payments, event: { id: events.id, title: events.title, startsAt: events.startsAt, location: events.location } })
    .from(orders)
    .innerJoin(payments, eq(payments.id, orders.paymentId))
    .leftJoin(events, eq(events.id, orders.pickupEventId))
    .where(and(eq(orders.memberId, memberId), ne(orders.status, "pending")))
    .orderBy(desc(payments.paidAt));
  if (rows.length === 0) return [];
  const paymentIds = rows.map((row) => row.payment.id);
  const [items, trail] = await Promise.all([
    db.select().from(paymentItems).where(inArray(paymentItems.paymentId, paymentIds)),
    db
      .select({ entityId: auditLog.entityId, action: auditLog.action, at: auditLog.createdAt })
      .from(auditLog)
      .where(and(eq(auditLog.entityType, "payment"), inArray(auditLog.entityId, paymentIds), like(auditLog.action, "payment.order_%")))
      .orderBy(asc(auditLog.createdAt)),
  ]);
  // Today's photo of each piece (the line itself keeps the name and price paid).
  const variantIds = [...new Set(items.map((item) => item.variantId).filter((id): id is string => Boolean(id)))];
  const productRows = variantIds.length
    ? await db.select({ variantId: productVariants.id, images: products.images, slug: products.slug }).from(productVariants).innerJoin(products, eq(products.id, productVariants.productId)).where(inArray(productVariants.id, variantIds))
    : [];
  return rows.map(({ order, payment, event }) => {
    const steps = trail.filter((step) => step.entityId === payment.id);
    const last = (status: string) => [...steps].reverse().find((step) => step.action === `payment.order_${status}`)?.at ?? null;
    return {
      id: order.id,
      reference: payment.reference,
      paymentId: payment.id,
      status: order.status,
      fulfilment: order.fulfilment,
      shippingAddress: order.shippingAddress,
      trackingNumber: order.trackingNumber,
      event: event?.id ? event : null,
      amount: payment.amount,
      receiptNumber: payment.receiptNumber,
      paidAt: payment.paidAt,
      readyAt: last("ready"),
      shippedAt: last("shipped"),
      handedOverAt: order.handedOverAt ?? last("handed_over"),
      items: items
        .filter((item) => item.paymentId === payment.id && item.type === "product")
        .map((item) => {
          const product = productRows.find((row) => row.variantId === item.variantId);
          return { id: item.id, description: item.description, quantity: item.quantity, total: item.total, image: product?.images[0] ?? null, slug: product?.slug ?? null };
        }),
    };
  });
}
