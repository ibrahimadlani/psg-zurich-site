import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { members, paymentItems, payments, type Locale, type PaymentKind } from "@/db/schema";
import { isDuesPaid } from "@/lib/dues";
import { formatPaymentReference } from "@/lib/payments/config";
import { duesPriceFor } from "@/lib/payments/dues-price";
import { nextNumber } from "@/lib/payments/numbering";
import { stripe } from "@/lib/payments/stripe";
import { holdCart, priceCart, type CartLine, type Fulfilment } from "@/lib/payments/shop";
import { HttpError } from "@/lib/permissions";

type Member = typeof members.$inferSelect;
type Line = { type: "dues" | "product" | "shipping" | "donation"; description: string; quantity: number; unitAmount: number; season?: string; variantId?: string };

export type CheckoutRequest =
  | { kind: "dues"; member: Member; email: string }
  | { kind: "shop"; member: Member; email: string; cart: CartLine[]; fulfilment: Fulfilment }
  | { kind: "donation"; amount: number; member: Member | null; name: string; email: string; message?: string; anonymous: boolean };

export type Checkout = {
  reference: string;
  clientSecret: string;
  amount: number;
  /** Ways this payment can be made (TWINT only where the account offers it). */
  methods: ("card" | "twint")[];
  /** A card kept from an earlier payment: offered as "Pay with Visa •••• 4242". */
  savedCard: { id: string; brand: string; last4: string } | null;
};

/** Payment customer of a member (created once), so a card can be offered again next time. */
async function customerFor(member: Member, email: string) {
  if (member.stripeCustomerId) return member.stripeCustomerId;
  const customer = await stripe().customers.create(
    { email, name: `${member.firstName} ${member.lastName}`.trim(), preferred_locales: [member.locale], metadata: { memberId: member.id } },
    { idempotencyKey: `customer:${member.id}` },
  );
  await db.update(members).set({ stripeCustomerId: customer.id }).where(eq(members.id, member.id));
  return customer.id;
}

async function savedCardOf(customer: string) {
  const { data } = await stripe().paymentMethods.list({ customer, type: "card", limit: 1 });
  const card = data[0]?.card;
  return data[0] && card ? { id: data[0].id, brand: card.brand, last4: card.last4 } : null;
}

/** The lines and the payer of a checkout, priced on the server (never from the browser). */
async function price(request: CheckoutRequest, locale: Locale): Promise<{ lines: Line[]; payer: { name: string; email: string; memberId: string | null } }> {
  if (request.kind === "dues") {
    const { member } = request;
    if (member.status !== "active") throw new HttpError(409, "membership_inactive", "The committee has not accepted the membership yet.");
    if (isDuesPaid(member)) throw new HttpError(409, "already_paid", "The fee of this season is already paid.");
    const { season, amount, junior } = await duesPriceFor(member);
    const label = { fr: "Cotisation", en: "Membership fee", de: "Mitgliederbeitrag" }[locale];
    const juniorLabel = { fr: " junior", en: " (junior)", de: " Junior" }[locale];
    return {
      lines: [{ type: "dues", description: `${label}${junior ? juniorLabel : ""} ${season}`, quantity: 1, unitAmount: amount, season }],
      payer: { name: `${member.firstName} ${member.lastName}`.trim(), email: request.email, memberId: member.id },
    };
  }
  if (request.kind === "shop") {
    const { member } = request;
    return {
      lines: await priceCart(request.cart, request.fulfilment, locale),
      payer: { name: `${member.firstName} ${member.lastName}`.trim(), email: request.email, memberId: member.id },
    };
  }
  const label = { fr: "Don au club", en: "Donation to the club", de: "Spende an den Club" }[locale];
  return {
    lines: [{ type: "donation", description: label, quantity: 1, unitAmount: request.amount }],
    payer: { name: request.name, email: request.email, memberId: request.member?.id ?? null },
  };
}

/**
 * Starts a payment: the payment and its lines are written first (pending), then the payment
 * intent is created with our id in its metadata. The browser gets back only what it needs
 * to confirm the payment on the page.
 */
export async function createPayment(request: CheckoutRequest, { locale, ipAddress }: { locale: Locale; ipAddress: string | null }): Promise<Checkout> {
  const { lines, payer } = await price(request, locale);
  const amount = lines.reduce((sum, line) => sum + line.unitAmount * line.quantity, 0);
  if (amount < 100) throw new HttpError(400, "amount_too_small", "Amount too small.");

  const kind: PaymentKind = request.kind;
  const { id, reference } = await db.transaction(async (tx) => {
    const reference = await nextNumber(tx, "P", 0);
    const id = crypto.randomUUID();
    await tx.insert(payments).values({
      id,
      reference,
      kind,
      amount,
      memberId: payer.memberId,
      payerName: payer.name,
      payerEmail: payer.email,
      locale,
      message: request.kind === "donation" ? (request.message?.trim() || null) : null,
      anonymous: request.kind === "donation" ? request.anonymous : false,
      ipAddress,
    });
    await tx.insert(paymentItems).values(
      lines.map((line) => ({ paymentId: id, ...line, total: line.unitAmount * line.quantity })),
    );
    // Shop: the pieces are set aside while the payment is made (or the checkout refused).
    if (request.kind === "shop") await holdCart(tx, id, request.member.id, lines, request.fulfilment);
    return { id, reference };
  });

  const member = request.member;
  const customer = member ? await customerFor(member, payer.email) : null;
  const label = formatPaymentReference(reference);
  // Card (with Apple Pay / Google Pay) and TWINT: the provider keeps those the account offers
  // for this payment and lists them in payment_method_types.
  const intent = await stripe().paymentIntents.create(
    {
      amount,
      currency: "chf",
      allowed_payment_method_types: ["card", "twint"],
      description: `${label} · ${lines.map((line) => line.description).join(", ")}`,
      metadata: { paymentId: id, reference: label, kind },
      ...(customer ? { customer, payment_method_options: { card: { setup_future_usage: "on_session" as const } } } : {}),
    },
    { idempotencyKey: `payment:${id}` },
  );
  await db.update(payments).set({ stripePaymentIntentId: intent.id }).where(eq(payments.id, id));

  return {
    reference: label,
    clientSecret: intent.client_secret!,
    amount,
    methods: intent.payment_method_types.filter((method): method is "card" | "twint" => method === "card" || method === "twint"),
    savedCard: customer ? await savedCardOf(customer) : null,
  };
}
