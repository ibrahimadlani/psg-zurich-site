import { eq } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema";
import { apiHandler, ok, parseBody } from "@/lib/api";
import { getClientIp, writeAuditLog } from "@/lib/audit";
import { HttpError, requireCapability } from "@/lib/permissions";
import { roleChangeSchema } from "@/lib/validators";

/** Name or remove an admin. Superadmin only; superadmins are never changed here. */
export const PATCH = apiHandler(async (request) => {
  const session = await requireCapability("roles");
  const { email, role } = await parseBody(request, roleChangeSchema);

  const [target] = await db.select({ id: user.id, role: user.role }).from(user).where(eq(user.email, email));
  if (!target) throw new HttpError(404, "not_found", "No account uses this email address.");
  if (target.id === session.user.id) throw new HttpError(409, "self", "You cannot change your own role.");
  if (target.role === "superadmin") throw new HttpError(409, "superadmin", "Superadmins are managed in the database.");
  if (target.role === role) return ok({ email, role });

  await db.transaction(async (tx) => {
    await tx.update(user).set({ role }).where(eq(user.id, target.id));
    await writeAuditLog(
      {
        actorId: session.user.id,
        action: "user.role_change",
        entityType: "user",
        entityId: target.id,
        metadata: { from: target.role, to: role },
        ipAddress: getClientIp(request.headers),
      },
      tx,
    );
  });

  return ok({ email, role });
});
