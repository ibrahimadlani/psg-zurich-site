import "server-only";
import { and, asc, count, eq, gte, inArray, isNotNull, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { attendance, events, matches, members, user } from "@/db/schema";
import type { EventFormValues, MatchOption } from "@/components/admin/event-form";
import { isDuesPaid, isJunior, seasonEnd, todayInZurich } from "@/lib/dues";
import { matchTitle } from "@/lib/matches";

const DAY = 24 * 60 * 60 * 1000;

/** datetime-local value in Zurich time (the club's), from a UTC date. */
export const toLocalInput = (date: Date | null) =>
  date
    ? new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Zurich", dateStyle: "short", timeStyle: "short" }).format(date).replace(" ", "T")
    : "";

/** Sign-up figures per event: registered, waiting, present. */
async function tallies(eventIds: string[]) {
  if (eventIds.length === 0) return new Map<string, { registered: number; waitlisted: number; present: number }>();
  const rows = await db
    .select({
      eventId: attendance.eventId,
      registered: sql<number>`sum(${attendance.status} = 'registered')`,
      waitlisted: sql<number>`sum(${attendance.status} = 'waitlisted')`,
      present: sql<number>`sum(${attendance.checkedInAt} is not null)`,
    })
    .from(attendance)
    .where(inArray(attendance.eventId, eventIds))
    .groupBy(attendance.eventId);
  return new Map(rows.map((row) => [row.eventId, { registered: Number(row.registered), waitlisted: Number(row.waitlisted), present: Number(row.present) }]));
}

/** The admin's event list: everything still to come, and the last six months. */
export async function listAdminEvents() {
  const since = new Date(Date.now() - 183 * DAY);
  const rows = await db
    .select({ event: events, opponent: matches.opponent, venue: matches.venue })
    .from(events)
    .leftJoin(matches, eq(matches.id, events.matchId))
    .where(gte(events.startsAt, since))
    .orderBy(asc(events.startsAt));
  const counts = await tallies(rows.map((row) => row.event.id));
  return rows.map(({ event, opponent, venue }) => ({
    id: event.id,
    type: event.type,
    title: event.title,
    location: event.location,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    capacity: event.capacity,
    match: opponent && venue ? matchTitle({ opponent, venue }, "PSG") : null,
    ...(counts.get(event.id) ?? { registered: 0, waitlisted: 0, present: 0 }),
  }));
}
export type AdminEventRow = Awaited<ReturnType<typeof listAdminEvents>>[number];

/** One event for the admin: details, form values, and everyone signed up (or who was). */
export async function adminEventDetail(id: string) {
  const [row] = await db
    .select({ event: events, match: matches })
    .from(events)
    .leftJoin(matches, eq(matches.id, events.matchId))
    .where(eq(events.id, id));
  if (!row) return null;
  const people = await db
    .select({
      memberId: members.id,
      firstName: members.firstName,
      lastName: members.lastName,
      memberNumber: members.memberNumber,
      phone: members.phone,
      status: attendance.status,
      checkedInAt: attendance.checkedInAt,
      signedUpAt: attendance.createdAt,
      memberStatus: members.status,
      expiresOn: members.expiresOn,
      birthDate: members.birthDate,
      photoConsent: members.photoConsent,
      email: user.email,
      image: user.image,
    })
    .from(attendance)
    .innerJoin(members, eq(members.id, attendance.memberId))
    .innerJoin(user, eq(user.id, members.userId))
    .where(eq(attendance.eventId, id))
    .orderBy(asc(attendance.createdAt));

  const { event } = row;
  const form: EventFormValues = {
    type: event.type,
    title: event.title,
    description: event.description ?? "",
    matchId: event.matchId ?? "",
    location: event.location ?? "",
    address: event.address ?? "",
    placeId: event.placeId ?? "",
    latitude: event.latitude,
    longitude: event.longitude,
    startsAt: toLocalInput(event.startsAt),
    endsAt: toLocalInput(event.endsAt),
    capacity: event.capacity?.toString() ?? "",
    notifyMembers: false,
  };
  return {
    event,
    match: row.match,
    form,
    attendees: people.map(({ memberStatus, expiresOn, birthDate, ...person }) => ({
      ...person,
      paid: isDuesPaid({ status: memberStatus, expiresOn }),
      junior: isJunior(birthDate),
    })),
  };
}
export type Attendee = NonNullable<Awaited<ReturnType<typeof adminEventDetail>>>["attendees"][number];

/** Matches an event can be linked to: from yesterday on (a watch party is planned ahead). */
export async function matchOptions(format: (date: Date) => string): Promise<MatchOption[]> {
  const rows = await db
    .select()
    .from(matches)
    .where(gte(matches.kickoffAt, new Date(Date.now() - DAY)))
    .orderBy(asc(matches.kickoffAt))
    .limit(40);
  return rows.map((match) => ({
    id: match.id,
    label: `${format(match.kickoffAt)} · ${matchTitle(match, "PSG")} (${match.competition})`,
    title: matchTitle(match, "PSG"),
    // Doors open 30 minutes before kick-off.
    kickoff: toLocalInput(new Date(match.kickoffAt.getTime() - 30 * 60 * 1000)),
  }));
}

/** The season's events so far: how full they were, and how many signed-up members came. */
export async function eventStats() {
  const end = seasonEnd(todayInZurich());
  const seasonStart = new Date(`${Number(end.slice(0, 4)) - 1}-07-01T00:00:00Z`);
  const past = await db
    .select({ id: events.id, capacity: events.capacity })
    .from(events)
    .where(and(gte(events.startsAt, seasonStart), lt(events.startsAt, new Date())));
  const counts = await tallies(past.map((event) => event.id));
  const limited = past.filter((event) => event.capacity);
  const fill = limited.length
    ? limited.reduce((sum, event) => sum + Math.min(1, (counts.get(event.id)?.registered ?? 0) / event.capacity!), 0) / limited.length
    : null;
  // Presence only counts events where someone was scanned (no scan = no data).
  const scanned = past.filter((event) => (counts.get(event.id)?.present ?? 0) > 0);
  const registered = scanned.reduce((sum, event) => sum + (counts.get(event.id)?.registered ?? 0), 0);
  const present = scanned.reduce((sum, event) => sum + (counts.get(event.id)?.present ?? 0), 0);
  return {
    held: past.length,
    fill,
    presence: registered ? Math.min(1, present / registered) : null,
    noShows: Math.max(0, registered - present),
  };
}

/** Last time football-data.org matches were synced. */
export async function lastMatchSync() {
  const [row] = await db
    .select({ at: sql<Date | null>`max(${matches.syncedAt})` })
    .from(matches)
    .where(isNotNull(matches.externalId));
  return row?.at ? new Date(row.at) : null;
}

/** Matches for the admin: upcoming ones, and the last month's. */
export async function listAdminMatches() {
  const rows = await db
    .select()
    .from(matches)
    .where(gte(matches.kickoffAt, new Date(Date.now() - 31 * DAY)))
    .orderBy(asc(matches.kickoffAt));
  const linked = rows.length
    ? await db
        .select({ matchId: events.matchId, value: count() })
        .from(events)
        .where(inArray(events.matchId, rows.map((match) => match.id)))
        .groupBy(events.matchId)
    : [];
  return rows.map((match) => ({ match, events: linked.find((row) => row.matchId === match.id)?.value ?? 0 }));
}
