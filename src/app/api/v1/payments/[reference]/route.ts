import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { events, orders, paymentItems, payments } from "@/db/schema";
import { apiHandler, ok } from "@/lib/api";
import { getCurrentMember } from "@/lib/members";
import { parsePaymentReference } from "@/lib/payments/config";
import { syncPaymentIntent } from "@/lib/payments/settle";
import { stripe } from "@/lib/payments/stripe";
import { HttpError } from "@/lib/permissions";

type Context = RouteContext<"/api/v1/payments/[reference]">;

/**
 * Where a payment stands, for the payer's page (after TWINT or a 3-D Secure check). Members see
 * their own payments; anyone else proves it is theirs with the secret the browser got at
 * checkout. Still pending here: the provider is asked directly, so the page never waits on a
 * late webhook.
 */
export const GET = apiHandler<Context>(async (request, { params }) => {
  const reference = parsePaymentReference((await params).reference);
  if (reference === null) throw new HttpError(404, "not_found", "Payment not found.");
  const [payment] = await db.select().from(payments).where(eq(payments.reference, reference));
  if (!payment?.stripePaymentIntentId) throw new HttpError(404, "not_found", "Payment not found.");

  const secret = request.nextUrl.searchParams.get("secret");
  const member = await getCurrentMember();
  const own = member !== null && payment.memberId === member.id;
  if (!own) {
    const intent = secret ? await stripe().paymentIntents.retrieve(payment.stripePaymentIntentId) : null;
    if (!intent || intent.client_secret !== secret) throw new HttpError(404, "not_found", "Payment not found.");
  }

  const status = payment.status === "pending" || payment.status === "processing" || payment.status === "failed" ? await syncPaymentIntent(payment.stripePaymentIntentId) : payment.status;
  const [fresh] = await db
    .select({ status: payments.status, kind: payments.kind, amount: payments.amount, receiptNumber: payments.receiptNumber, method: payments.method })
    .from(payments)
    .where(eq(payments.id, payment.id));
  // An order: its pieces and how they come (the confirmation page shows them).
  const order =
    payment.kind === "shop"
      ? await db
          .select({ fulfilment: orders.fulfilment, event: events.title, eventAt: events.startsAt, city: sql<string | null>`json_unquote(json_extract(${orders.shippingAddress}, '$.city'))` })
          .from(orders)
          .leftJoin(events, eq(events.id, orders.pickupEventId))
          .where(eq(orders.paymentId, payment.id))
          .then((rows) => rows[0] ?? null)
      : null;
  const items =
    payment.kind === "shop"
      ? await db.select({ description: paymentItems.description, quantity: paymentItems.quantity, type: paymentItems.type }).from(paymentItems).where(eq(paymentItems.paymentId, payment.id))
      : [];
  return ok({ ...fresh, status: status ?? fresh?.status, order, items: items.filter((item) => item.type === "product") });
});
