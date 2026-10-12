import { asc, eq } from "drizzle-orm";
import { after } from "next/server";
import { db } from "@/db";
import { events } from "@/db/schema";
import { apiHandler, ok, parseBody, parseQuery } from "@/lib/api";
import { getClientIp, writeAuditLog } from "@/lib/audit";
import { notifyNewEvent } from "@/lib/notifications";
import { requireRole } from "@/lib/permissions";
import { createEventSchema, pagination } from "@/lib/validators";

export const GET = apiHandler(async (request) => {
  const { limit, offset } = parseQuery(request, pagination);
  const rows = await db
    .select()
    .from(events)
    .orderBy(asc(events.startsAt))
    .limit(limit)
    .offset(offset);
  return ok(rows);
});

export const POST = apiHandler(async (request) => {
  const session = await requireRole("admin");
  const input = await parseBody(request, createEventSchema);

  const created = await db.transaction(async (tx) => {
    const id = crypto.randomUUID();
    const { notifyMembers, ...values } = input;
    await tx.insert(events).values({ ...values, id });
    await writeAuditLog(
      {
        actorId: session.user.id,
        action: "event.create",
        entityType: "event",
        entityId: id,
        metadata: { type: input.type, title: input.title },
        ipAddress: getClientIp(request.headers),
      },
      tx,
    );
    const [row] = await tx.select().from(events).where(eq(events.id, id));
    return row;
  });

  // After the response: the admin doesn't wait for every email.
  if (input.notifyMembers && created) after(() => notifyNewEvent(created.id));

  return ok(created, { status: 201 });
});
