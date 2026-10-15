import { and, eq } from "drizzle-orm";
import { after } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { attendance, events, members } from "@/db/schema";
import { apiHandler, ok, parseBody } from "@/lib/api";
import { getClientIp, writeAuditLog } from "@/lib/audit";
import { promoteFromWaitlist } from "@/lib/events";
import { onWaitlistPromoted } from "@/lib/mailing/triggers";
import { HttpError, requireCapability } from "@/lib/permissions";

type Context = RouteContext<"/api/v1/events/[id]/attendees">;

const schema = z.object({
  memberId: z.string().min(1).max(36),
  action: z.enum(["checkin", "uncheck", "promote", "remove", "add"]),
});

/**
 * The organisers manage who comes, member by member:
 * - `checkin` / `uncheck`: present at the door (signed up on the spot if needed), or not;
 * - `promote`: from the waiting list to a place (even beyond capacity: the organiser decides);
 * - `remove`: takes the place back; the first on the waiting list gets it;
 * - `add`: signs a member up by hand (a place, whatever the capacity).
 */
export const PATCH = apiHandler<Context>(async (request, { params }) => {
  const { memberId, action } = await parseBody(request, schema);
  const session = await requireCapability(action === "checkin" || action === "uncheck" ? "scan" : "events");
  const { id: eventId } = await params;

  const [member] = await db.select({ id: members.id }).from(members).where(eq(members.id, memberId));
  if (!member) throw new HttpError(404, "not_found", "Member not found.");

  const result = await db.transaction(async (tx) => {
    const [event] = await tx.select({ id: events.id }).from(events).where(eq(events.id, eventId)).for("update");
    if (!event) throw new HttpError(404, "not_found", "Event not found.");
    const [existing] = await tx
      .select()
      .from(attendance)
      .where(and(eq(attendance.eventId, eventId), eq(attendance.memberId, memberId)));
    let promoted: string | null = null;
    const now = new Date();

    if (action === "checkin" || action === "add") {
      const values = { status: "registered" as const, ...(action === "checkin" ? { checkedInAt: now } : {}) };
      if (existing) await tx.update(attendance).set(values).where(eq(attendance.id, existing.id));
      else await tx.insert(attendance).values({ id: crypto.randomUUID(), eventId, memberId, ...values });
    } else {
      if (!existing) throw new HttpError(404, "not_signed_up", "This member is not signed up.");
      if (action === "uncheck") {
        await tx.update(attendance).set({ checkedInAt: null }).where(eq(attendance.id, existing.id));
      } else if (action === "promote") {
        if (existing.status !== "waitlisted") throw new HttpError(409, "invalid_status", "Only waitlisted members can be promoted.");
        await tx.update(attendance).set({ status: "registered" }).where(eq(attendance.id, existing.id));
        promoted = memberId;
      } else {
        await tx.update(attendance).set({ status: "cancelled", checkedInAt: null }).where(eq(attendance.id, existing.id));
        if (existing.status === "registered") promoted = await promoteFromWaitlist(eventId, tx);
      }
    }

    await writeAuditLog(
      {
        actorId: session.user.id,
        action: `event.attendee_${action}`,
        entityType: "event",
        entityId: eventId,
        metadata: { memberId, ...(promoted && promoted !== memberId ? { promoted } : {}) },
        ipAddress: getClientIp(request.headers),
      },
      tx,
    );
    return { promoted };
  });

  if (result.promoted) after(() => onWaitlistPromoted(result.promoted!, eventId));
  return ok({ action, promoted: result.promoted });
});
