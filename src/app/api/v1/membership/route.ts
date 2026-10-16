import { APIError } from "better-auth/api";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { members, user } from "@/db/schema";
import { apiHandler, fail, ok, parseBody } from "@/lib/api";
import { getClientIp, getProxiedClientIp, writeAuditLog } from "@/lib/audit";
import { getAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { withReturn } from "@/lib/return-to";
import { membershipSignupSchema } from "@/lib/validators";

/**
 * Public membership sign-up: creates the account plus a pending member profile, and
 * emails a confirmation link (the account can sign in once confirmed). This is the only
 * way to create an account.
 */
const SIGNUPS_PER_HOUR = 5;

export const POST = apiHandler(async (request) => {
  const input = await parseBody(request, membershipSignupSchema);

  // Robot filled the hidden field: same answer as a real sign-up, nothing created or sent.
  if (input.website) return ok({ status: "pending" }, { status: 201 });

  const ip = getProxiedClientIp(request.headers) ?? "unknown";
  if (!rateLimit(`signup:${ip}`, SIGNUPS_PER_HOUR, 60 * 60 * 1000)) {
    return fail(429, "too_many_requests", "Too many sign-ups from this network. Please try again later.");
  }

  // With email verification on, Better Auth answers a duplicate with a fake user rather
  // than an error: detect it first.
  const [existing] = await db.select({ id: user.id }).from(user).where(eq(user.email, input.email)).limit(1);
  if (existing) return fail(409, "email_taken", "An account already exists for this email.");

  let userId: string;
  try {
    const { user: created } = await getAuth().api.signUpEmail({
      body: {
        name: `${input.firstName} ${input.lastName}`,
        email: input.email,
        password: input.password,
        // The confirmation link signs in and lands on the welcome step (also sets the email's
        // language), which then goes on to the page wanted before joining.
        callbackURL: withReturn(`/${input.locale}/bienvenue`, input.next),
      },
      headers: request.headers,
    });
    userId = created.id;
  } catch (error) {
    if (error instanceof APIError && error.body?.code?.startsWith("USER_ALREADY_EXISTS")) {
      return fail(409, "email_taken", "An account already exists for this email.");
    }
    throw error;
  }

  try {
    const member = await db.transaction(async (tx) => {
      const id = crypto.randomUUID();
      await tx.insert(members).values({
        id,
        userId,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone || null,
        address: input.address || null,
        postcode: input.postcode || null,
        city: input.city || null,
        status: "pending",
        locale: input.locale,
      });
      await writeAuditLog(
        {
          actorId: userId,
          action: "member.signup",
          entityType: "member",
          entityId: id,
          // Consent to the statutes and data processing, as ticked on the form.
          metadata: { acceptedTermsAt: new Date().toISOString() },
          ipAddress: getClientIp(request.headers),
        },
        tx,
      );
      const [row] = await tx.select().from(members).where(eq(members.id, id));
      return row;
    });
    return ok({ status: member?.status ?? "pending" }, { status: 201 });
  } catch (error) {
    // Never leave an account without its member profile.
    await db.delete(user).where(eq(user.id, userId));
    throw error;
  }
});
