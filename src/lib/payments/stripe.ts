import "server-only";
import Stripe from "stripe";

let client: Stripe | null = null;

/** Online payments need the secret key on the server (and the publishable one in the build). */
export const paymentsEnabled = () => Boolean(process.env.STRIPE_SECRET_KEY) && Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

export function stripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not set.");
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY, {
    appInfo: { name: "psg-zurich.ch" },
    maxNetworkRetries: 2,
  });
  return client;
}

export type { Stripe };
