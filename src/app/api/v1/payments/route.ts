import { z } from "zod";
import { LOCALES } from "@/db/schema";
import { apiHandler, ok, parseBody } from "@/lib/api";
import { getProxiedClientIp } from "@/lib/audit";
import { getCurrentMember, requireActiveMember } from "@/lib/members";
import { createPayment } from "@/lib/payments/checkout";
import { DONATION_MAX, DONATION_MIN } from "@/lib/payments/config";
import { paymentsEnabled } from "@/lib/payments/stripe";
import { getSession, HttpError } from "@/lib/permissions";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("dues"), locale: z.enum(LOCALES).default("fr") }),
  z.object({
    kind: z.literal("shop"),
    locale: z.enum(LOCALES).default("fr"),
    items: z.array(z.object({ variantId: z.uuid(), quantity: z.number().int().min(1).max(10) })).min(1).max(20),
    fulfilment: z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("pickup"), eventId: z.string().min(1).max(36) }),
      z.object({
        kind: z.literal("shipping"),
        address: z.object({ name: z.string().trim().min(1).max(200), street: z.string().trim().min(3).max(255), postcode: z.string().trim().regex(/^\d{4}$/), city: z.string().trim().min(1).max(100) }),
      }),
    ]),
  }),
  z.object({
    kind: z.literal("donation"),
    locale: z.enum(LOCALES).default("fr"),
    amount: z.number().int().min(DONATION_MIN).max(DONATION_MAX),
    // Visitors give their name and email; members' come from their profile.
    name: z.string().trim().min(1).max(200).optional(),
    email: z.email().max(255).optional(),
    message: z.string().trim().max(500).optional(),
    anonymous: z.boolean().default(false),
  }),
]);

/** Starts a payment (fee, shop order or donation): the amount is set here, never by the browser. */
export const POST = apiHandler(async (request) => {
  if (!paymentsEnabled()) throw new HttpError(503, "payments_disabled", "Online payment is not available.");
  const ip = getProxiedClientIp(request.headers) ?? "unknown";
  if (!rateLimit(`payment:${ip}`, 20, 60 * 60 * 1000)) throw new HttpError(429, "too_many_requests", "Too many payment attempts. Please try again later.");
  const input = await parseBody(request, schema);
  const context = { locale: input.locale, ipAddress: getProxiedClientIp(request.headers) };

  if (input.kind === "dues") {
    const { session, member } = await requireActiveMember();
    return ok(await createPayment({ kind: "dues", member, email: session.user.email }, context), { status: 201 });
  }

  // The shop is for accepted members.
  if (input.kind === "shop") {
    const { session, member } = await requireActiveMember();
    return ok(await createPayment({ kind: "shop", member, email: session.user.email, cart: input.items, fulfilment: input.fulfilment }, context), { status: 201 });
  }

  const [session, member] = await Promise.all([getSession(), getCurrentMember()]);
  const name = member ? `${member.firstName} ${member.lastName}`.trim() : input.name;
  const email = session?.user.email ?? input.email;
  if (!name || !email) throw new HttpError(400, "payer_required", "Name and email are required.");
  if (!rateLimit(`donation:${email.toLowerCase()}`, 5, 60 * 60 * 1000)) throw new HttpError(429, "too_many_requests", "Too many payment attempts. Please try again later.");
  return ok(
    await createPayment({ kind: "donation", amount: input.amount, member, name, email: email.toLowerCase(), message: input.message, anonymous: input.anonymous }, context),
    { status: 201 },
  );
});
