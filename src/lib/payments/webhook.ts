import "server-only";
import { and, asc, eq, isNull, lt } from "drizzle-orm";
import { db } from "@/db";
import { stripeEvents } from "@/db/schema";
import { reconcilePayout } from "@/lib/payments/payouts";
import { syncRefund } from "@/lib/payments/refund";
import { syncPaymentIntent } from "@/lib/payments/settle";
import type { Stripe } from "@/lib/payments/stripe";

/** Handles one stored provider event. Throws to be tried again later. */
async function handle(event: Stripe.Event) {
  switch (event.type) {
    case "payment_intent.succeeded":
    case "payment_intent.processing":
    case "payment_intent.payment_failed":
    case "payment_intent.canceled":
      await syncPaymentIntent(event.data.object.id);
      return;
    case "refund.created":
    case "refund.updated":
    case "refund.failed":
      await syncRefund(event.data.object);
      return;
    case "charge.refunded":
      for (const refund of event.data.object.refunds?.data ?? []) await syncRefund(refund);
      return;
    case "payout.paid":
    case "payout.failed":
      await reconcilePayout(event.data.object);
      return;
    default:
      // Kept as proof, nothing to do.
      return;
  }
}

/**
 * Stores the event first (its id is unique: a repeated delivery is seen at once), then
 * handles it. A failure is written on the event and retried by the worker.
 */
export async function receiveEvent(event: Stripe.Event) {
  await db
    .insert(stripeEvents)
    .values({ id: event.id, type: event.type, payload: event as unknown as Record<string, unknown> })
    .onDuplicateKeyUpdate({ set: { id: event.id } });
  const [row] = await db.select({ processedAt: stripeEvents.processedAt }).from(stripeEvents).where(eq(stripeEvents.id, event.id));
  if (row?.processedAt) return { duplicate: true };
  await process(event);
  return { duplicate: false };
}

async function process(event: Stripe.Event) {
  try {
    await handle(event);
    await db.update(stripeEvents).set({ processedAt: new Date(), error: null }).where(eq(stripeEvents.id, event.id));
  } catch (error) {
    console.error("[payments] event failed", event.id, error);
    const [row] = await db.select({ attempts: stripeEvents.attempts }).from(stripeEvents).where(eq(stripeEvents.id, event.id));
    await db
      .update(stripeEvents)
      .set({ attempts: (row?.attempts ?? 0) + 1, error: String(error instanceof Error ? error.message : error).slice(0, 500) })
      .where(eq(stripeEvents.id, event.id));
  }
}

/** Worker: events that failed, tried again (at most 10 times). */
export async function retryFailedEvents() {
  const pending = await db
    .select()
    .from(stripeEvents)
    .where(and(isNull(stripeEvents.processedAt), lt(stripeEvents.attempts, 10)))
    .orderBy(asc(stripeEvents.receivedAt))
    .limit(20);
  for (const row of pending) await process(row.payload as unknown as Stripe.Event);
}
