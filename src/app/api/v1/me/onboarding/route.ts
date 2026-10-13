import { eq } from "drizzle-orm";
import { db } from "@/db";
import { members } from "@/db/schema";
import { apiHandler, ok, parseBody } from "@/lib/api";
import { profileValues } from "@/lib/member-profile";
import { HttpError, requireRole } from "@/lib/permissions";
import { onboardingSchema } from "@/lib/validators";

/**
 * Saves one welcome step (empty contact fields keep what is there); `done` ends the flow,
 * finished or skipped.
 */
export const POST = apiHandler(async (request) => {
  const session = await requireRole("member");
  const { done, phone, address, postcode, city, ...profile } = await parseBody(request, onboardingSchema);
  const [member] = await db.select({ id: members.id }).from(members).where(eq(members.userId, session.user.id));
  if (!member) throw new HttpError(404, "not_found", "No member profile for this account.");

  const values = {
    ...(done ? { onboardedAt: new Date() } : {}),
    ...(phone ? { phone } : {}),
    ...(address ? { address, postcode: postcode || null, city: city || null } : {}),
    ...profileValues(profile),
  };
  if (Object.keys(values).length > 0) await db.update(members).set(values).where(eq(members.id, member.id));
  return ok({ onboarded: done });
});
