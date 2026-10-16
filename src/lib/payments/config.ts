/*
 * Online payments (card, TWINT, Apple Pay / Google Pay). The publishable key is inlined at
 * build time; the secret key and the webhook secret stay on the server. Without them, online
 * payment is hidden and the committee records payments by hand.
 */
export const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
export const onlinePaymentsEnabled = PUBLISHABLE_KEY.length > 0;

/** Payment reference shown to people: P-000123. */
export const formatPaymentReference = (reference: number) => `P-${String(reference).padStart(6, "0")}`;

/** "P-000123" → 123 (null when it is not one). */
export function parsePaymentReference(value: string) {
  const match = /^P-(\d{1,9})$/i.exec(value.trim());
  return match ? Number(match[1]) : null;
}

/** Quick donation amounts, in centimes. */
export const DONATION_PRESETS = [1000, 2500, 5000, 10000];
export const DONATION_MIN = 500;
export const DONATION_MAX = 1_000_000;
