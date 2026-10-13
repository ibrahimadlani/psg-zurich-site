import { and, eq } from "drizzle-orm";
import { after } from "next/server";
import { db } from "@/db";
import { attendance, events } from "@/db/schema";
import { apiHandler, ok } from "@/lib/api";
import { promoteFromWaitlist, registeredCount } from "@/lib/events";
import { onSignUp, onWaitlistPromoted } from "@/lib/mailing/triggers";
import { requirePaidMember } from "@/lib/members";
import { HttpError } from "@/lib/permissions";

type Context = RouteContext<"/api/v1/events/[id]/attendance">;

/** Sign up: registered while places remain, waitlisted after. */
export const POST = apiHandler<Context>(async (_request, { params }) => {
  const { member } = await requirePaidMember();
  const { id } = await params;

  const status = await db.transaction(async (tx) => {
    // Locks the event row: two last-place sign-ups can't both succeed.
    const [event] = await tx.select().from(events).where(eq(events.id, id)).for("update");
    if (!event) throw new HttpError(404, "not_found", "Event not found.");
    if (event.startsAt.getTime() <= Date.now()) throw new HttpError(409, "past", "This event has already started.");

    const [existing] = await tx
      .select()
      .from(attendance)
      .where(and(eq(attendance.eventId, id), eq(attendance.memberId, member.id)));
    if (existing && existing.status !== "cancelled") return existing.status;

    const full = event.capacity !== null && (await registeredCount(id, tx)) >= event.capacity;
    const next = full ? ("waitlisted" as const) : ("registered" as const);
    if (existing) {
      // Back in line: a returning member goes to the end of the waitlist.
      await tx.update(attendance).set({ status: next, createdAt: new Date() }).where(eq(attendance.id, existing.id));
    } else {
      await tx.insert(attendance).values({ id: crypto.randomUUID(), eventId: id, memberId: member.id, status: next });
    }
    return next;
  });

  if (status === "registered") after(() => onSignUp(id));
  return ok({ status });
});

/** Cancel my sign-up; the first waitlisted member takes the place. */
export const DELETE = apiHandler<Context>(async (_request, { params }) => {
  const { member } = await requirePaidMember();
  const { id } = await params;

  const promoted = await db.transaction(async (tx) => {
    await tx.select({ id: events.id }).from(events).where(eq(events.id, id)).for("update");
    const [existing] = await tx
      .select()
      .from(attendance)
      .where(and(eq(attendance.eventId, id), eq(attendance.memberId, member.id)));
    if (!existing || existing.status === "cancelled") return null;
    await tx.update(attendance).set({ status: "cancelled" }).where(eq(attendance.id, existing.id));
    return existing.status === "registered" ? promoteFromWaitlist(id, tx) : null;
  });

  if (promoted) after(() => onWaitlistPromoted(promoted, id));
  return ok({ status: "cancelled" });
});
