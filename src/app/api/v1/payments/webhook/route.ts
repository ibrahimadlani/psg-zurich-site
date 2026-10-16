import { NextResponse, type NextRequest } from "next/server";
import { receiveEvent } from "@/lib/payments/webhook";
import { paymentsEnabled, stripe } from "@/lib/payments/stripe";

/**
 * Notifications from the payment provider. The signature is checked on the raw body; the
 * event is stored before anything else, then 200 is answered (a failed handling is retried
 * by the worker, not by the provider).
 */
export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!paymentsEnabled() || !secret) return NextResponse.json({ error: "payments_disabled" }, { status: 404 });
  const signature = request.headers.get("stripe-signature");
  const body = await request.text();
  let event;
  try {
    event = stripe().webhooks.constructEvent(body, signature ?? "", secret);
  } catch {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }
  const result = await receiveEvent(event);
  return NextResponse.json({ received: true, duplicate: result.duplicate });
}
