import { eq } from "drizzle-orm";
import { db } from "@/db";
import { members } from "@/db/schema";
import { apiHandler, ok, parseBody } from "@/lib/api";
import { HttpError, requireRole } from "@/lib/permissions";
import { onboardingSchema } from "@/lib/validators";

/** Ends the welcome step: saves what was filled in (empty fields keep what is there). */
export const POST = apiHandler(async (request) => {
  const session = await requireRole("member");
  const input = await parseBody(request, onboardingSchema);
  const [member] = await db.select({ id: members.id }).from(members).where(eq(members.userId, session.user.id));
  if (!member) throw new HttpError(404, "not_found", "No member profile for this account.");

  await db
    .update(members)
    .set({
      onboardedAt: new Date(),
      ...(input.phone ? { phone: input.phone } : {}),
      ...(input.address ? { address: input.address, postcode: input.postcode || null, city: input.city || null } : {}),
    })
    .where(eq(members.id, member.id));
  return ok({ onboarded: true });
});
