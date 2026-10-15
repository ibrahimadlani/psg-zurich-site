import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { attendance, events } from "@/db/schema";
import { apiHandler, ok, parseBody } from "@/lib/api";
import { getClientIp, writeAuditLog } from "@/lib/audit";
import { memberByCardToken } from "@/lib/member-card";
import { HttpError, requireCapability } from "@/lib/permissions";

type Context = RouteContext<"/api/v1/events/[id]/checkin">;

/**
 * Entrance of an event: an organiser scanned a member card. The member counts as present
 * (signed up on the spot if they were not, or were on the waiting list).
 */
export const POST = apiHandler<Context>(async (request, { params }) => {
  const session = await requireCapability("scan");
  const { id: eventId } = await params;
  const { token } = await parseBody(request, z.object({ token: z.string().max(64) }));

  const member = await memberByCardToken(token);
  if (!member) throw new HttpError(404, "unknown_card", "Unknown member card.");
  const [event] = await db.select({ id: events.id }).from(events).where(eq(events.id, eventId));
  if (!event) throw new HttpError(404, "not_found", "Event not found.");

  const now = new Date();
  await db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: attendance.id })
      .from(attendance)
      .where(and(eq(attendance.eventId, eventId), eq(attendance.memberId, member.id)));
    if (existing) {
      await tx.update(attendance).set({ status: "registered", checkedInAt: now }).where(eq(attendance.id, existing.id));
    } else {
      await tx.insert(attendance).values({
        id: crypto.randomUUID(),
        eventId,
        memberId: member.id,
        status: "registered",
        checkedInAt: now,
      });
    }
    await writeAuditLog(
      {
        actorId: session.user.id,
        action: "event.checkin",
        entityType: "event",
        entityId: eventId,
        metadata: { memberId: member.id },
        ipAddress: getClientIp(request.headers),
      },
      tx,
    );
  });
  return ok({ checkedInAt: now.toISOString() });
});
