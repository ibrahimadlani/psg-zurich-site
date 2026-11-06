import "server-only";
import { and, asc, count, eq, gte, inArray, type SQL } from "drizzle-orm";
import { db, type Transaction } from "@/db";
import { attendance, events, matches, members, user } from "@/db/schema";
import { displayName } from "@/lib/leaderboard";

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
      match: {
        id: matches.id,
        opponent: matches.opponent,
        opponentLogo: matches.opponentLogo,
        venue: matches.venue,
        kickoffAt: matches.kickoffAt,
      },
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

/** "open" until it starts (sign-ups close then), "started" while it runs, "over" after. */
export function eventPhase(event: { startsAt: Date; endsAt: Date | null }) {
  const now = Date.now();
  if (event.startsAt.getTime() > now) return "open" as const;
  return (event.endsAt ?? event.startsAt).getTime() > now ? ("started" as const) : ("over" as const);
}

/** Upcoming events (not started yet). */
export const upcomingEvents = () => gte(events.startsAt, new Date());

/**
 * Members registered for an event, in sign-up order, as other members see them: the
 * leaderboard name ("Prénom N." or nickname) and the profile picture.
 */
export async function eventParticipants(eventId: string) {
  const rows = await db
    .select({
      memberId: members.id,
      firstName: members.firstName,
      lastName: members.lastName,
      nickname: members.nickname,
      email: user.email,
      image: user.image,
    })
    .from(attendance)
    .innerJoin(members, eq(members.id, attendance.memberId))
    .innerJoin(user, eq(user.id, members.userId))
    .where(and(eq(attendance.eventId, eventId), eq(attendance.status, "registered")))
    .orderBy(asc(attendance.createdAt));
  return rows.map((row) => ({ ...row, name: displayName(row.firstName, row.lastName, row.nickname) }));
}

/**
 * Upcoming events the committee made public, for anyone: only what may be shown outside the
 * club. Never add the place, the address, the description or the participants here.
 */
export async function publicUpcomingEvents(limit = 8) {
  return db
    .select({ id: events.id, type: events.type, title: events.title, city: events.city, startsAt: events.startsAt })
    .from(events)
    .where(and(eq(events.isPublic, true), upcomingEvents()))
    .orderBy(asc(events.startsAt))
    .limit(limit);
}

/** Over: past its end, or past its start when it has no end. */
export const eventIsOver = (event: { startsAt: Date; endsAt: Date | null }) => (event.endsAt ?? event.startsAt).getTime() < Date.now();

/** The event the committee opened to everyone for a match, if any: its city, never its place. */
export async function publicEventForMatch(matchId: string) {
  const [event] = await db
    .select({ id: events.id, city: events.city })
    .from(events)
    .where(and(eq(events.matchId, matchId), eq(events.isPublic, true), upcomingEvents()))
    .orderBy(asc(events.startsAt))
    .limit(1);
  return event ?? null;
}

/** One event as anyone may see it, or null when the committee keeps it for members. */
export async function publicEvent(id: string) {
  const [event] = await db
    .select({ id: events.id, type: events.type, title: events.title, city: events.city, startsAt: events.startsAt, endsAt: events.endsAt })
    .from(events)
    .where(and(eq(events.id, id), eq(events.isPublic, true)));
  return event ?? null;
}
