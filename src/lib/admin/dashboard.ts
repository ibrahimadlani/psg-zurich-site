import "server-only";
import { and, asc, count, desc, eq, gt, gte, inArray, isNotNull, isNull, lt, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { attendance, contactThreads, emailJobs, events, matches, members, posts, predictions, subscribers, user } from "@/db/schema";
import { seasonEnd, todayInZurich } from "@/lib/dues";
import { can } from "@/lib/roles";
import type { Role } from "@/db/schema";
import { inboxCounts } from "@/lib/admin/messages-query";
import { visibleTopics } from "@/lib/contact";

const DAY = 24 * 60 * 60 * 1000;

/** YYYY-MM-DD, `years` before `today`. */
const yearsBefore = (today: string, years: number) => `${Number(today.slice(0, 4)) - years}${today.slice(4)}`;

/** Badge numbers of the admin navigation, for what this role may see. */
export async function adminCounters(role: Role) {
  const today = todayInZurich();
  const [requests, unpaid, failed] = await Promise.all([
    can(role, "members.read")
      ? db
          .select({ value: count() })
          .from(members)
          .innerJoin(user, eq(user.id, members.userId))
          .where(and(eq(members.status, "pending"), eq(user.emailVerified, true)))
      : null,
    can(role, "members.write")
      ? db
          .select({ value: count() })
          .from(members)
          .where(and(eq(members.status, "active"), or(isNull(members.expiresOn), lt(members.expiresOn, today))))
      : null,
    can(role, "mailing")
      ? db
          .select({ value: count() })
          .from(emailJobs)
          .where(and(eq(emailJobs.status, "failed"), gte(emailJobs.createdAt, new Date(Date.now() - 7 * DAY))))
      : null,
  ]);
  const messages = can(role, "messages") ? (await inboxCounts(role)).toHandle : 0;
  return {
    messages,
    requests: requests?.[0]?.value ?? 0,
    unpaid: unpaid?.[0]?.value ?? 0,
    failedEmails: failed?.[0]?.value ?? 0,
  };
}

/** Members over the season: totals, this month, juniors and the active count at each month's end. */
export async function memberStats() {
  const today = todayInZurich();
  const end = seasonEnd(today);
  const seasonStart = `${Number(end.slice(0, 4)) - 1}-07-01`;
  const monthStart = `${today.slice(0, 7)}-01`;
  const rows = await db
    .select({ joinedOn: members.joinedOn, birthDate: members.birthDate, expiresOn: members.expiresOn })
    .from(members)
    .where(eq(members.status, "active"));

  const juniorBorn = yearsBefore(today, 18);
  // One point per month since July: members who had joined by the end of that month.
  const months: string[] = [];
  for (let cursor = seasonStart; cursor <= today; ) {
    const [year, month] = cursor.split("-").map(Number) as [number, number];
    const next = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;
    months.push(next);
    cursor = next;
  }
  const series = months.map((before) => rows.filter((row) => !row.joinedOn || row.joinedOn < before).length);

  return {
    active: rows.length,
    newThisMonth: rows.filter((row) => row.joinedOn && row.joinedOn >= monthStart).length,
    juniors: rows.filter((row) => row.birthDate && row.birthDate > juniorBorn).length,
    series,
    paid: rows.filter((row) => row.expiresOn && row.expiresOn >= today).length,
    seasonEnd: end,
  };
}

/** The next club event and how full it is. */
export async function nextEventFill() {
  const [event] = await db
    .select({ id: events.id, title: events.title, startsAt: events.startsAt, capacity: events.capacity })
    .from(events)
    .where(gt(events.startsAt, new Date()))
    .orderBy(asc(events.startsAt))
    .limit(1);
  if (!event) return null;
  const tally = await db
    .select({ status: attendance.status, value: count() })
    .from(attendance)
    .where(and(eq(attendance.eventId, event.id), inArray(attendance.status, ["registered", "waitlisted"])))
    .groupBy(attendance.status);
  const of = (status: string) => tally.find((row) => row.status === status)?.value ?? 0;
  return { ...event, registered: of("registered"), waitlisted: of("waitlisted") };
}

/** Requests whose applicant has not confirmed the email yet. */
export async function unverifiedRequests() {
  const [row] = await db
    .select({ value: count() })
    .from(members)
    .innerJoin(user, eq(user.id, members.userId))
    .where(and(eq(members.status, "pending"), eq(user.emailVerified, false)));
  return row?.value ?? 0;
}

/** Articles published with a date still to come. */
export async function scheduledPosts() {
  return db
    .select({ id: posts.id, title: posts.title, publishedAt: posts.publishedAt })
    .from(posts)
    .where(and(eq(posts.status, "published"), sql`${posts.publishedAt} > now()`))
    .orderBy(asc(posts.publishedAt))
    .limit(3);
}

/**
 * Reach of the club's channels: newsletter subscribers, emails of the last 30 days, articles
 * published this season, and the share of members who predicted the last match played.
 */
export async function audienceStats() {
  const end = seasonEnd(todayInZurich());
  const seasonStart = new Date(`${Number(end.slice(0, 4)) - 1}-07-01T00:00:00Z`);
  const since = new Date(Date.now() - 30 * DAY);
  const [[subscribed], mail, [published], [active], [lastMatch]] = await Promise.all([
    db.select({ value: count() }).from(subscribers).where(eq(subscribers.status, "confirmed")),
    db
      .select({ status: emailJobs.status, value: count() })
      .from(emailJobs)
      .where(and(gte(emailJobs.createdAt, since), inArray(emailJobs.status, ["sent", "failed"])))
      .groupBy(emailJobs.status),
    db
      .select({ value: count() })
      .from(posts)
      .where(and(eq(posts.status, "published"), gte(posts.publishedAt, seasonStart), lte(posts.publishedAt, new Date()))),
    db.select({ value: count() }).from(members).where(eq(members.status, "active")),
    db
      .select({ id: matches.id, opponent: matches.opponent, venue: matches.venue })
      .from(matches)
      .where(eq(matches.status, "finished"))
      .orderBy(desc(matches.kickoffAt))
      .limit(1),
  ]);
  const [predicted] = lastMatch
    ? await db.select({ value: count() }).from(predictions).where(eq(predictions.matchId, lastMatch.id))
    : [null];
  const of = (status: string) => mail.find((row) => row.status === status)?.value ?? 0;
  return {
    subscribers: subscribed?.value ?? 0,
    sent: of("sent"),
    failed: of("failed"),
    published: published?.value ?? 0,
    lastMatch: lastMatch ?? null,
    predictionShare: lastMatch && active?.value ? Math.min(1, (predicted?.value ?? 0) / active.value) : null,
    predicted: predicted?.value ?? 0,
  };
}

/** Contact messages: how many wait, and the median time to a first reply over 90 days (hours). */
export async function contactStats(role: Role) {
  const topics = visibleTopics(role);
  const [{ toHandle }, replied] = await Promise.all([
    inboxCounts(role),
    topics.length
      ? db
          .select({ createdAt: contactThreads.createdAt, firstReplyAt: contactThreads.firstReplyAt })
          .from(contactThreads)
          .where(and(inArray(contactThreads.topic, topics), isNotNull(contactThreads.firstReplyAt), gte(contactThreads.createdAt, new Date(Date.now() - 90 * DAY))))
      : [],
  ]);
  const delays = replied.map((row) => row.firstReplyAt!.getTime() - row.createdAt.getTime()).sort((a, b) => a - b);
  const median = delays.length ? delays[Math.floor(delays.length / 2)]! : null;
  return { toHandle, medianHours: median === null ? null : Math.floor(median / (60 * 60 * 1000)) };
}
