import { and, eq, ne } from "drizzle-orm";
import { after } from "next/server";
import { db } from "@/db";
import { attendance, events } from "@/db/schema";
import { apiHandler, ok, parseBody } from "@/lib/api";
import { getClientIp, writeAuditLog } from "@/lib/audit";
import { onEventCancelled } from "@/lib/mailing/triggers";
import { HttpError, requireRole } from "@/lib/permissions";
import { createEventSchema } from "@/lib/validators";

type Context = RouteContext<"/api/v1/events/[id]">;

// The "email the members" choice only applies when an event is created.
const withoutNotify = <T extends { notifyMembers?: boolean }>({ notifyMembers, ...rest }: T) => rest;

async function findOrThrow(id: string) {
  const [row] = await db.select().from(events).where(eq(events.id, id));
  if (!row) throw new HttpError(404, "not_found", "Event not found.");
  return row;
}

/** Full update of an event (the admin form always sends every field). */
export const PATCH = apiHandler<Context>(async (request, { params }) => {
  const session = await requireRole("admin");
  const { id } = await params;
  const input = await parseBody(request, createEventSchema);
  await findOrThrow(id);

  const updated = await db.transaction(async (tx) => {
    await tx
      .update(events)
      .set({
        ...withoutNotify(input),
        description: input.description ?? null,
        matchId: input.matchId ?? null,
        location: input.location ?? null,
        address: input.address ?? null,
        placeId: input.placeId ?? null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        endsAt: input.endsAt ?? null,
        capacity: input.capacity ?? null,
      })
      .where(eq(events.id, id));
    await writeAuditLog(
      {
        actorId: session.user.id,
        action: "event.update",
        entityType: "event",
        entityId: id,
        metadata: { title: input.title },
        ipAddress: getClientIp(request.headers),
      },
      tx,
    );
    const [row] = await tx.select().from(events).where(eq(events.id, id));
    return row;
  });
  return ok(updated);
});

export const DELETE = apiHandler<Context>(async (request, { params }) => {
  const session = await requireRole("admin");
  const { id } = await params;
  const event = await findOrThrow(id);
  // Read before the deletion (sign-ups go with it): they are told it is cancelled.
  const signedUp = event.startsAt.getTime() > Date.now()
    ? (await db.select({ memberId: attendance.memberId }).from(attendance).where(and(eq(attendance.eventId, id), ne(attendance.status, "cancelled")))).map((row) => row.memberId)
    : [];

  await db.transaction(async (tx) => {
    // Sign-ups go with it (ON DELETE CASCADE).
    await tx.delete(events).where(eq(events.id, id));
    await writeAuditLog(
      {
        actorId: session.user.id,
        action: "event.delete",
        entityType: "event",
        entityId: id,
        metadata: { title: event.title },
        ipAddress: getClientIp(request.headers),
      },
      tx,
    );
  });
  after(() => onEventCancelled(event, signedUp));
  return ok({ deleted: true });
});
