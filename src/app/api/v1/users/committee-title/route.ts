import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { members, user } from "@/db/schema";
import { apiHandler, ok, parseBody } from "@/lib/api";
import { getClientIp, writeAuditLog } from "@/lib/audit";
import { HttpError, requireCapability } from "@/lib/permissions";
import { hasRole } from "@/lib/roles";

/** Role title of a committee member ("Président"…), shown on the contact page; empty hides them there. */
export const PATCH = apiHandler(async (request) => {
  const session = await requireCapability("roles");
  const input = await parseBody(request, z.object({ userId: z.string().min(1).max(36), title: z.string().trim().max(60) }));
  const [account] = await db.select({ role: user.role }).from(user).where(eq(user.id, input.userId));
  if (!account || !hasRole(account.role, "moderator")) throw new HttpError(404, "not_found", "Not a committee member.");
  const [member] = await db.select({ id: members.id }).from(members).where(eq(members.userId, input.userId));
  if (!member) throw new HttpError(404, "no_member", "This account has no member profile yet.");
  await db.transaction(async (tx) => {
    await tx.update(members).set({ committeeTitle: input.title || null }).where(eq(members.id, member.id));
    await writeAuditLog(
      { actorId: session.user.id, action: "member.committeeTitle", entityType: "member", entityId: member.id, metadata: { title: input.title || null }, ipAddress: getClientIp(request.headers) },
      tx,
    );
  });
  return ok({ title: input.title || null });
});
