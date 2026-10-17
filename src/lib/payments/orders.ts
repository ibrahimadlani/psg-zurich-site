import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { events, orders, paymentItems, payments, type OrderStatus } from "@/db/schema";
import { writeAuditLog } from "@/lib/audit";
import { upcomingEvents } from "@/lib/events";
import { emailDate, enqueue } from "@/lib/mailing/queue";
import { itemsSummary, payerRecipient } from "@/lib/payments/after-payment";
import { formatPaymentReference } from "@/lib/payments/config";
import { HttpError } from "@/lib/permissions";

/** Where an order can go from each state. */
const NEXT: Record<OrderStatus, OrderStatus[]> = {
  pending: [],
  paid: ["ready", "shipped", "handed_over"],
  ready: ["handed_over", "paid"],
  handed_over: ["ready"],
  shipped: ["paid"],
  canceled: [],
};

/**
 * The committee moves an order on. "Ready" tells the buyer where to pick it up (the next club
 * event), "shipped" sends the tracking number; every step is written in the payment's trail.
 */
export async function updateOrder(orderId: string, status: OrderStatus, { actorId, ipAddress, trackingNumber }: { actorId: string; ipAddress: string | null; trackingNumber?: string }) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order) throw new HttpError(404, "not_found", "Order not found.");
  if (order.status === status) return order;
  if (!NEXT[order.status].includes(status)) throw new HttpError(409, "invalid_status", `An order cannot go from ${order.status} to ${status}.`);
  if (status === "shipped" && order.fulfilment !== "shipping") throw new HttpError(409, "invalid_status", "This order is picked up, not shipped.");

  await db
    .update(orders)
    .set({
      status,
      ...(status === "handed_over" ? { handedOverAt: new Date(), handedOverById: actorId } : {}),
      ...(status === "shipped" ? { trackingNumber: trackingNumber || null } : {}),
    })
    .where(eq(orders.id, orderId));
  await writeAuditLog({ actorId, action: `payment.order_${status}`, entityType: "payment", entityId: order.paymentId, metadata: { orderId, trackingNumber: trackingNumber ?? null }, ipAddress });

  const [payment] = await db.select().from(payments).where(eq(payments.id, order.paymentId));
  if (payment && (status === "ready" || status === "shipped")) {
    const reference = formatPaymentReference(payment.reference);
    const items = await itemsSummary(payment.id);
    const recipient = await payerRecipient(payment);
    if (status === "ready") {
      // The event the buyer chose, else the club's next one.
      const [chosen] = order.pickupEventId ? await db.select().from(events).where(eq(events.id, order.pickupEventId)) : [];
      const [upcoming] = chosen ? [] : await db.select().from(events).where(upcomingEvents()).orderBy(asc(events.startsAt)).limit(1);
      const next = chosen ?? upcoming;
      const pickup = next
        ? `${next.title}, ${emailDate(next.startsAt, payment.locale)}`
        : { fr: "à la prochaine activité du club", en: "at the club's next event", de: "am nächsten Clubanlass" }[payment.locale];
      await enqueue("shop.ready", [recipient], () => ({ values: { payment: reference, items, pickup }, path: "/espace-membre/commandes", dedupe: `shop.ready:${order.id}` }));
    } else {
      await enqueue("shop.shipped", [recipient], () => ({
        values: { payment: reference, items, tracking: trackingNumber || "—" },
        url: trackingNumber ? `https://service.post.ch/ekp-web/ui/entry/shipment/${encodeURIComponent(trackingNumber)}` : undefined,
        path: trackingNumber ? undefined : "/espace-membre/commandes",
        dedupe: `shop.shipped:${order.id}`,
      }));
    }
  }
  const [fresh] = await db.select().from(orders).where(eq(orders.id, orderId));
  return fresh!;
}

/** At the door: the orders a member can take home (paid or ready, picked up at an event). */
export async function pickupsFor(memberId: string) {
  const rows = await db
    .select({ order: orders, reference: payments.reference, event: events.title })
    .from(orders)
    .innerJoin(payments, eq(payments.id, orders.paymentId))
    .leftJoin(events, eq(events.id, orders.pickupEventId))
    .where(and(eq(orders.memberId, memberId), eq(orders.fulfilment, "pickup"), inArray(orders.status, ["paid", "ready"])));
  if (rows.length === 0) return [];
  const items = await db.select().from(paymentItems).where(and(inArray(paymentItems.paymentId, rows.map((row) => row.order.paymentId)), eq(paymentItems.type, "product")));
  return rows.map(({ order, reference, event }) => ({
    id: order.id,
    reference: formatPaymentReference(reference),
    status: order.status,
    event,
    items: items.filter((item) => item.paymentId === order.paymentId).map((item) => ({ description: item.description, quantity: item.quantity })),
  }));
}
