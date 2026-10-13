import { eq } from "drizzle-orm";
import { db } from "@/db";
import { members, user } from "@/db/schema";
import { apiHandler, ok, parseBody } from "@/lib/api";
import { getClientIp, writeAuditLog } from "@/lib/audit";
import { HttpError, requireRole } from "@/lib/permissions";
import { profileUpdateSchema } from "@/lib/validators";

/** The signed-in member edits their own profile (the display name follows). */
export const PATCH = apiHandler(async (request) => {
  const session = await requireRole("member");
  const input = await parseBody(request, profileUpdateSchema);

  const [member] = await db.select({ id: members.id }).from(members).where(eq(members.userId, session.user.id));
  if (!member) throw new HttpError(404, "not_found", "No member profile for this account.");

  await db.transaction(async (tx) => {
    await tx
      .update(members)
      .set({
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone || null,
        address: input.address || null,
        postcode: input.postcode || null,
        city: input.city || null,
      })
      .where(eq(members.id, member.id));
    await tx
      .update(user)
      .set({ name: `${input.firstName} ${input.lastName}` })
      .where(eq(user.id, session.user.id));
    await writeAuditLog(
      {
        actorId: session.user.id,
        action: "member.profile_update",
        entityType: "member",
        entityId: member.id,
        ipAddress: getClientIp(request.headers),
      },
      tx,
    );
  });

  return ok({ updated: true });
});
