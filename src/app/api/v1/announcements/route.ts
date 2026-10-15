import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { announcements } from "@/db/schema";
import { deactivateOthers } from "@/lib/announcements";
import { apiHandler, ok, parseBody, parseQuery } from "@/lib/api";
import { getClientIp, writeAuditLog } from "@/lib/audit";
import { requireCapability } from "@/lib/permissions";
import { announcementSchema, pagination } from "@/lib/validators";

export const GET = apiHandler(async (request) => {
  await requireCapability("news");
  const { limit, offset } = parseQuery(request, pagination);
  const rows = await db
    .select()
    .from(announcements)
    .orderBy(desc(announcements.createdAt))
    .limit(limit)
    .offset(offset);
  return ok(rows);
});

export const POST = apiHandler(async (request) => {
  const session = await requireCapability("news");
  const input = await parseBody(request, announcementSchema);

  const created = await db.transaction(async (tx) => {
    const id = crypto.randomUUID();
    await tx.insert(announcements).values({ ...input, id, createdById: session.user.id });
    if (input.active) await deactivateOthers(id, tx);
    await writeAuditLog(
      {
        actorId: session.user.id,
        action: "announcement.create",
        entityType: "announcement",
        entityId: id,
        metadata: { tone: input.tone, title: input.titleFr, active: input.active },
        ipAddress: getClientIp(request.headers),
      },
      tx,
    );
    const [row] = await tx.select().from(announcements).where(eq(announcements.id, id));
    return row;
  });

  return ok(created, { status: 201 });
});
