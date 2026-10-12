import "server-only";
import { and, asc, count, eq, gte, inArray, type SQL } from "drizzle-orm";
import { db, type Transaction } from "@/db";
import { attendance, events, matches } from "@/db/schema";

/** Registered (not waitlisted) sign-ups of an event. */
export async function registeredCount(eventId: string, executor: Transaction | typeof db = db) {
  const [row] = await executor
    .select({ value: count() })
    .from(attendance)
    .where(and(eq(attendance.eventId, eventId), eq(attendance.status, "registered")));
  return row?.value ?? 0;
}

/** Moves the earliest waitlisted member up when a place frees; returns their member id. */
export async function promoteFromWaitlist(eventId: string, tx: Transaction) {
  const [event] = await tx.select({ capacity: events.capacity }).from(events).where(eq(events.id, eventId));
  if (!event) return null;
  if (event.capacity !== null && (await registeredCount(eventId, tx)) >= event.capacity) return null;

  const [next] = await tx
    .select({ id: attendance.id, memberId: attendance.memberId })
    .from(attendance)
    .where(and(eq(attendance.eventId, eventId), eq(attendance.status, "waitlisted")))
    .orderBy(asc(attendance.createdAt))
    .limit(1);
  if (!next) return null;
  await tx.update(attendance).set({ status: "registered" }).where(eq(attendance.id, next.id));
  return next.memberId;
}

export type EventView = Awaited<ReturnType<typeof getEventsWithAttendance>>[number];

/**
 * Events (filtered by `where`), with the number of registered members, the signed-in
 * member's own status and the linked match's headline.
 */
export async function getEventsWithAttendance(where: SQL | undefined, memberId: string | null) {
  const rows = await db
    .select({
      event: events,
      match: { id: matches.id, opponent: matches.opponent, venue: matches.venue, kickoffAt: matches.kickoffAt },
    })
    .from(events)
    .leftJoin(matches, eq(matches.id, events.matchId))
    .where(where)
    .orderBy(asc(events.startsAt));
  if (rows.length === 0) return [];

  const ids = rows.map((row) => row.event.id);
  const [counts, mine] = await Promise.all([
    db
      .select({ eventId: attendance.eventId, value: count() })
      .from(attendance)
      .where(and(inArray(attendance.eventId, ids), eq(attendance.status, "registered")))
      .groupBy(attendance.eventId),
    memberId
      ? db
          .select({ eventId: attendance.eventId, status: attendance.status })
          .from(attendance)
          .where(and(inArray(attendance.eventId, ids), eq(attendance.memberId, memberId)))
      : [],
  ]);
  const registered = new Map(counts.map((row) => [row.eventId, row.value]));
  const own = new Map(mine.map((row) => [row.eventId, row.status]));

  return rows.map(({ event, match }) => ({
    ...event,
    match: match?.id ? match : null,
    registered: registered.get(event.id) ?? 0,
    myStatus: own.get(event.id) ?? null,
  }));
}

/** Upcoming events (not started yet). */
export const upcomingEvents = () => gte(events.startsAt, new Date());
