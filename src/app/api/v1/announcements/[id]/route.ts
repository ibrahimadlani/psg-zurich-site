import { eq } from "drizzle-orm";
import { db } from "@/db";
import { announcements } from "@/db/schema";
import { deactivateOthers } from "@/lib/announcements";
import { apiHandler, ok, parseBody } from "@/lib/api";
import { getClientIp, writeAuditLog } from "@/lib/audit";
import { HttpError, requireRole } from "@/lib/permissions";
import { announcementPatchSchema } from "@/lib/validators";

type Context = RouteContext<"/api/v1/announcements/[id]">;

async function findOrThrow(id: string) {
  const [row] = await db.select().from(announcements).where(eq(announcements.id, id));
  if (!row) throw new HttpError(404, "not_found", "Announcement not found.");
  return row;
}

/** Switch a banner on or off. */
export const PATCH = apiHandler<Context>(async (request, { params }) => {
  const session = await requireRole("admin");
  const { id } = await params;
  const { active } = await parseBody(request, announcementPatchSchema);
  await findOrThrow(id);

  const updated = await db.transaction(async (tx) => {
    await tx.update(announcements).set({ active }).where(eq(announcements.id, id));
    if (active) await deactivateOthers(id, tx);
    await writeAuditLog(
      {
        actorId: session.user.id,
        action: active ? "announcement.activate" : "announcement.deactivate",
        entityType: "announcement",
        entityId: id,
        ipAddress: getClientIp(request.headers),
      },
      tx,
    );
    const [row] = await tx.select().from(announcements).where(eq(announcements.id, id));
    return row;
  });

  return ok(updated);
});

export const DELETE = apiHandler<Context>(async (request, { params }) => {
  const session = await requireRole("admin");
  const { id } = await params;
  const row = await findOrThrow(id);

  await db.transaction(async (tx) => {
    await tx.delete(announcements).where(eq(announcements.id, id));
    await writeAuditLog(
      {
        actorId: session.user.id,
        action: "announcement.delete",
        entityType: "announcement",
        entityId: id,
        metadata: { title: row.titleFr },
        ipAddress: getClientIp(request.headers),
      },
      tx,
    );
  });

  return ok({ id });
});
