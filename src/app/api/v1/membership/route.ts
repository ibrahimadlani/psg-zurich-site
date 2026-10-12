import { APIError } from "better-auth/api";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { members, user } from "@/db/schema";
import { apiHandler, fail, ok, parseBody } from "@/lib/api";
import { getClientIp, writeAuditLog } from "@/lib/audit";
import { getAuth } from "@/lib/auth";
import { membershipSignupSchema } from "@/lib/validators";

/**
 * Public membership sign-up: creates the account plus a pending member profile, and
 * emails a confirmation link (the account can sign in once confirmed). This is the only
 * way to create an account.
 */
export const POST = apiHandler(async (request) => {
  const input = await parseBody(request, membershipSignupSchema);

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
        // Where the confirmation link lands; also sets the email's language.
        callbackURL: `/${input.locale}/connexion`,
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
        city: input.city || null,
        status: "pending",
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
