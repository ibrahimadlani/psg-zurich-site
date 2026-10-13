import { eq } from "drizzle-orm";
import { db } from "@/db";
import { members } from "@/db/schema";
import { apiHandler, fail, ok, parseBody } from "@/lib/api";
import { getClientIp, writeAuditLog } from "@/lib/audit";
import { profileValues } from "@/lib/member-profile";
import { HttpError, requireRole } from "@/lib/permissions";
import { memberSettingsSchema } from "@/lib/validators";

/** Leaderboard nickname and visibility, email language, notifications, member profile (any subset). */
export const PATCH = apiHandler(async (request) => {
  const session = await requireRole("member");
  const input = await parseBody(request, memberSettingsSchema);

  const [member] = await db.select({ id: members.id }).from(members).where(eq(members.userId, session.user.id));
  if (!member) throw new HttpError(404, "not_found", "No member profile for this account.");

  const { birthDate, interests, psgTicketing, photoConsent, ...settings } = input;
  const values = {
    ...settings,
    ...(settings.nickname !== undefined ? { nickname: settings.nickname || null } : {}),
    ...profileValues({ birthDate, interests, psgTicketing, photoConsent }),
  };
  if (Object.keys(values).length === 0) return ok({ updated: false });

  if (values.nickname) {
    const [taken] = await db.select({ id: members.id }).from(members).where(eq(members.nickname, values.nickname));
    if (taken && taken.id !== member.id) return fail(409, "nickname_taken", "This nickname is already used.");
  }

  await db.transaction(async (tx) => {
    await tx.update(members).set(values).where(eq(members.id, member.id));
    await writeAuditLog(
      {
        actorId: session.user.id,
        action: "member.settings_update",
        entityType: "member",
        entityId: member.id,
        metadata: { fields: Object.keys(values) },
        ipAddress: getClientIp(request.headers),
      },
      tx,
    );
  });
  return ok({ updated: true });
});
