import "server-only";
import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { paymentItems, payments, receipts, refunds, type Locale, type PaymentMethod } from "@/db/schema";
import { formatPaymentReference } from "@/lib/payments/config";
import { renderMoneyDocument } from "@/lib/payments/receipt-pdf";

const BRANDS: Record<string, string> = { visa: "Visa", mastercard: "Mastercard", amex: "American Express", discover: "Discover", jcb: "JCB", unionpay: "UnionPay", diners: "Diners Club" };

const METHODS: Record<Locale, Record<PaymentMethod, string>> = {
  fr: { card: "Carte", twint: "TWINT", apple_pay: "Apple Pay", google_pay: "Google Pay", bank_transfer: "Virement bancaire", cash: "Espèces", twint_manual: "TWINT (direct)" },
  en: { card: "Card", twint: "TWINT", apple_pay: "Apple Pay", google_pay: "Google Pay", bank_transfer: "Bank transfer", cash: "Cash", twint_manual: "TWINT (direct)" },
  de: { card: "Karte", twint: "TWINT", apple_pay: "Apple Pay", google_pay: "Google Pay", bank_transfer: "Banküberweisung", cash: "Bar", twint_manual: "TWINT (direkt)" },
};

/** "Visa •••• 4242", "Apple Pay (Visa •••• 4242)", "TWINT", "Virement bancaire"… */
export function methodLabel(payment: Pick<typeof payments.$inferSelect, "method" | "cardBrand" | "cardLast4">, locale: Locale) {
  if (!payment.method) return "—";
  const card = payment.cardLast4 ? `${BRANDS[payment.cardBrand ?? ""] ?? payment.cardBrand ?? ""} •••• ${payment.cardLast4}`.trim() : null;
  if (payment.method === "card") return card ?? METHODS[locale].card;
  if ((payment.method === "apple_pay" || payment.method === "google_pay") && card) return `${METHODS[locale][payment.method]} (${card})`;
  return METHODS[locale][payment.method];
}

async function store(number: string, pdf: Buffer, link: { paymentId?: string; refundId?: string }) {
  await db
    .insert(receipts)
    .values({ number, pdf, sha256: createHash("sha256").update(pdf).digest("hex"), ...link })
    .onDuplicateKeyUpdate({ set: { number } });
  const [row] = await db.select().from(receipts).where(eq(receipts.number, number));
  return row!;
}

/**
 * The receipt of a paid payment, issued once: the PDF is made the first time it is asked for
 * and kept as issued (with its fingerprint), so it never changes afterwards.
 */
export async function ensureReceipt(paymentId: string) {
  const [payment] = await db.select().from(payments).where(eq(payments.id, paymentId));
  if (!payment?.receiptNumber || !payment.paidAt) return null;
  const [existing] = await db.select().from(receipts).where(eq(receipts.number, payment.receiptNumber));
  if (existing) return existing;
  const items = await db.select().from(paymentItems).where(eq(paymentItems.paymentId, paymentId));
  const pdf = await renderMoneyDocument({
    kind: "receipt",
    locale: payment.locale,
    number: payment.receiptNumber,
    issuedAt: payment.paidAt,
    payer: { name: payment.payerName, email: payment.payerEmail },
    lines: items.map(({ description, quantity, unitAmount, total }) => ({ description, quantity, unitAmount, total })),
    total: payment.amount,
    method: methodLabel(payment, payment.locale),
    reference: formatPaymentReference(payment.reference),
  });
  return store(payment.receiptNumber, pdf, { paymentId });
}

/** The credit note of a refund that went through, issued once like a receipt. */
export async function ensureCreditNote(refundId: string) {
  const [refund] = await db.select().from(refunds).where(eq(refunds.id, refundId));
  if (!refund?.creditNoteNumber) return null;
  const [existing] = await db.select().from(receipts).where(eq(receipts.number, refund.creditNoteNumber));
  if (existing) return existing;
  const [payment] = await db.select().from(payments).where(eq(payments.id, refund.paymentId));
  if (!payment) return null;
  const label = { fr: "Remboursement", en: "Refund", de: "Rückerstattung" }[payment.locale];
  const pdf = await renderMoneyDocument({
    kind: "creditNote",
    locale: payment.locale,
    number: refund.creditNoteNumber,
    issuedAt: refund.updatedAt,
    payer: { name: payment.payerName, email: payment.payerEmail },
    lines: [{ description: `${label} · ${payment.receiptNumber ?? formatPaymentReference(payment.reference)}`, quantity: 1, unitAmount: refund.amount, total: refund.amount }],
    total: refund.amount,
    method: methodLabel(payment, payment.locale),
    reference: formatPaymentReference(payment.reference),
    relatesTo: payment.receiptNumber ?? undefined,
    reason: refund.reason,
  });
  return store(refund.creditNoteNumber, pdf, { refundId });
}
