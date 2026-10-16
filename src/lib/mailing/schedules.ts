import "server-only";
import { and, eq, gte, inArray, isNotNull, isNull, lt, lte, notInArray, or, type SQLWrapper } from "drizzle-orm";
import { db } from "@/db";
import { attendance, contactThreads, events, matches, members, predictions, user } from "@/db/schema";
import { seasonEnd, todayInZurich } from "@/lib/dues";
import { closeSeason, currentMonthBounds, getLeaderboard, seasonLabel, seasonOf } from "@/lib/leaderboard";
import { LEGAL } from "@/lib/legal";
import { launchScheduledCampaigns } from "@/lib/mailing/campaigns";
import { formatReference, topicReaders } from "@/lib/contact";
import { committeeRecipients, emailDate, enqueue, memberRecipients, type Recipient } from "@/lib/mailing/queue";
import { matchTitle } from "@/lib/matches";

/*
 * Emails found by a periodic scan (every 5 minutes). Each one has a dedupe key and a time
 * window, so scanning again never sends twice.
 */

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const ago = (ms: number) => new Date(Date.now() - ms);
const ahead = (ms: number) => new Date(Date.now() + ms);
/** Zurich date parts of now. */
const zurich = () => {
  const [year, month, day] = todayInZurich().split("-").map(Number) as [number, number, number];
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Zurich", hour: "2-digit", hourCycle: "h23" }).format(new Date()));
  return { year, month, day, hour };
};
/** Days ago, as a Zurich date (YYYY-MM-DD). */
const dateDaysAgo = (days: number) => todayInZurich(ago(days * DAY));
/** Members whose id is in a subquery, or in a list. */
const inArraySubquery = (subquery: SQLWrapper) => inArray(members.id, subquery);
const inArrayList = (ids: string[]) => inArray(members.id, ids.length ? ids : [""]);

/** "24 h left to predict": accepted members who haven't predicted the next match yet. */
async function predictionReminders() {
  const due = await db
    .select()
    .from(matches)
    .where(and(eq(matches.status, "scheduled"), isNull(matches.reminderSentAt), gte(matches.kickoffAt, new Date()), lte(matches.kickoffAt, ahead(DAY))));
  for (const match of due) {
    await db.update(matches).set({ reminderSentAt: new Date() }).where(eq(matches.id, match.id));
    const predicted = db.select({ memberId: predictions.memberId }).from(predictions).where(eq(predictions.matchId, match.id));
    const recipients = await memberRecipients(and(eq(members.status, "active"), notInArray(members.id, predicted))!);
    await enqueue("prediction.reminder", recipients, (recipient) => ({
      values: {
        matchId: match.id,
        match: matchTitle(match, "PSG"),
        competition: match.competition,
        time: emailDate(match.kickoffAt, recipient.locale),
      },
      path: `/matchs/${match.id}`,
      dedupe: `prediction.reminder:${match.id}:${recipient.memberId}`,
    }));
  }
}

/** Email still not confirmed 2 to 7 days after signing up: signing in sends a new link. */
async function verifyReminders() {
  const recipients = await memberRecipients(
    and(eq(members.status, "pending"), eq(user.emailVerified, false), lte(user.createdAt, ago(2 * DAY)), gte(user.createdAt, ago(7 * DAY)))!,
  );
  await enqueue("membership.verifyReminder", recipients, (recipient) => ({
    path: "/connexion",
    dedupe: `membership.verifyReminder:${recipient.memberId}`,
  }));
}

/** Requests waiting for more than 3 days: one summary a day to the committee, from 8 a.m. */
async function committeeDigest() {
  const { hour } = zurich();
  if (hour < 8) return;
  const waiting = await db
    .select({ firstName: members.firstName, lastName: members.lastName })
    .from(members)
    .innerJoin(user, eq(user.id, members.userId))
    .where(and(eq(members.status, "pending"), eq(user.emailVerified, true), lte(members.createdAt, ago(3 * DAY))));
  if (waiting.length === 0) return;
  const today = todayInZurich();
  await enqueue("membership.committeeDigest", await committeeRecipients(), (recipient) => ({
    values: { count: String(waiting.length), names: waiting.map((row) => `${row.firstName} ${row.lastName}`).join(", ") },
    path: "/admin/membres",
    dedupe: `membership.committeeDigest:${today}:${recipient.email}`,
  }));
}

/** Accepted 3 to 30 days ago, still no phone nor address. */
async function completeProfile() {
  const recipients = await memberRecipients(
    and(eq(members.status, "active"), isNull(members.phone), isNull(members.address), lte(members.joinedOn, dateDaysAgo(3)), gte(members.joinedOn, dateDaysAgo(30)))!,
  );
  await enqueue("membership.completeProfile", recipients, (recipient) => ({
    path: "/parametres/profil",
    dedupe: `membership.completeProfile:${recipient.memberId}`,
  }));
}

/** Fee still unpaid 7 and 21 days after acceptance (the guard re-checks before sending). */
async function feeReminders() {
  const end = seasonEnd();
  const unpaid = or(isNull(members.expiresOn), lt(members.expiresOn, todayInZurich()));
  for (const days of [7, 21]) {
    const recipients = await memberRecipients(
      and(eq(members.status, "active"), unpaid, lte(members.joinedOn, dateDaysAgo(days)), gte(members.joinedOn, dateDaysAgo(days + 30)))!,
    );
    await enqueue("fee.reminder", recipients, (recipient) => ({
      values: { fee: LEGAL.statutes.fee },
      path: "/cotisation",
      dedupe: `fee.reminder:${recipient.memberId}:${end}:${days}`,
    }));
  }
}

/** June: renewal notice to members paid until 30 June. July: "expired" to those who didn't renew. */
async function feeSeason() {
  const { year, month } = zurich();
  if (month === 6) {
    const until = `${year}-06-30`;
    const recipients = await memberRecipients(and(eq(members.status, "active"), eq(members.expiresOn, until))!);
    await enqueue("fee.renewal", recipients, (recipient) => ({
      values: { until: emailDate(new Date(`${until}T12:00:00Z`), recipient.locale, false), fee: LEGAL.statutes.fee },
      path: "/cotisation",
      dedupe: `fee.renewal:${recipient.memberId}:${year}`,
    }));
  }
  if (month === 7) {
    const recipients = await memberRecipients(and(eq(members.status, "active"), eq(members.expiresOn, `${year}-06-30`))!);
    await enqueue("fee.expired", recipients, (recipient) => ({
      values: { fee: LEGAL.statutes.fee },
      path: "/cotisation",
      dedupe: `fee.expired:${recipient.memberId}:${year}`,
    }));
  }
}

/** Day before: sign-ups of events starting in 20 to 28 hours. */
async function eventReminders() {
  const upcoming = await db.select().from(events).where(and(gte(events.startsAt, ahead(20 * HOUR)), lte(events.startsAt, ahead(28 * HOUR))));
  for (const event of upcoming) {
    const signedUp = db
      .select({ memberId: attendance.memberId })
      .from(attendance)
      .where(and(eq(attendance.eventId, event.id), eq(attendance.status, "registered")));
    const recipients = await memberRecipients(and(eq(members.status, "active"), inArraySubquery(signedUp))!);
    await enqueue("event.reminder", recipients, (recipient) => ({
      values: { eventId: event.id, event: event.title, date: emailDate(event.startsAt, recipient.locale), place: event.location ?? event.address ?? "—" },
      event: { type: event.type, startsAt: event.startsAt.toISOString() },
      path: `/evenements/${event.id}`,
      info: `${emailDate(event.startsAt, recipient.locale)} · ${event.location ?? event.address ?? ""}`,
      dedupe: `event.reminder:${event.id}:${recipient.memberId}`,
    }));
  }
}

/** Day after: thanks to the members let in at the entrance. */
async function eventThanks() {
  const past = await db.select().from(events).where(and(lte(events.startsAt, ago(18 * HOUR)), gte(events.startsAt, ago(48 * HOUR))));
  for (const event of past) {
    const present = db
      .select({ memberId: attendance.memberId })
      .from(attendance)
      .where(and(eq(attendance.eventId, event.id), isNotNull(attendance.checkedInAt)));
    const recipients = await memberRecipients(inArraySubquery(present));
    await enqueue("event.thanks", recipients, (recipient) => ({
      values: { eventId: event.id, event: event.title },
      event: { type: event.type, startsAt: event.startsAt.toISOString() },
      path: "/actualites",
      dedupe: `event.thanks:${event.id}:${recipient.memberId}`,
    }));
  }
}

/** 1st of the month, from 9 a.m.: rank and points of the past month. */
async function monthlyLeaderboard() {
  const { day, hour } = zurich();
  if (day !== 1 || hour < 9) return;
  const current = currentMonthBounds();
  const previous = currentMonthBounds(new Date(current.start.getTime() - 12 * HOUR));
  const board = await getLeaderboard("month", null, previous);
  if (board.length === 0) return;
  const byMember = new Map(board.map((row) => [row.memberId, row]));
  const month = todayInZurich(previous.start).slice(0, 7);
  const recipients = await memberRecipients(and(eq(members.status, "active"), inArrayList([...byMember.keys()]))!);
  await enqueue("leaderboard.monthly", recipients, (recipient) => {
    const row = byMember.get(recipient.memberId!)!;
    return {
      values: {
        month: new Intl.DateTimeFormat(recipient.locale, { month: "long", year: "numeric", timeZone: "Europe/Zurich" }).format(previous.start),
        rank: String(row.rank),
        total: String(board.length),
        points: String(row.points),
      },
      path: "/matchs/classement",
      dedupe: `leaderboard.monthly:${month}:${recipient.memberId}`,
    };
  });
}

/**
 * From 1 July: the prediction table of the season that ended on 30 June is frozen. The podium
 * is congratulated and the committee told who gets the prizes.
 */
async function closePredictionSeason() {
  const season = seasonOf() - 1;
  const podium = await closeSeason(season);
  if (!podium?.length) return;
  const label = seasonLabel(season);
  const byMember = new Map(podium.map((row) => [row.memberId, row]));
  const winners = await memberRecipients(and(eq(members.status, "active"), inArrayList([...byMember.keys()]))!);
  await enqueue("leaderboard.seasonWinner", winners, (recipient) => {
    const row = byMember.get(recipient.memberId!)!;
    return {
      values: { season: label, rank: String(row.rank), points: String(row.points) },
      path: `/matchs/classement?saison=${season}`,
      dedupe: `leaderboard.seasonWinner:${season}:${recipient.memberId}`,
    };
  });
  await enqueue("leaderboard.seasonPodium", await committeeRecipients(), (recipient) => ({
    values: {
      season: label,
      podium: podium.map((row) => `${row.rank}. ${row.firstName} ${row.lastName} (${row.points} pts)`).join(" · "),
    },
    path: "/admin/matchs",
    dedupe: `leaderboard.seasonPodium:${season}:${recipient.email}`,
  }));
}

/**
 * Every day from 9 a.m.: the contact messages waiting for over 24 hours, to the committee
 * members who read their topic (the page promises an answer within 24 hours).
 */
async function contactReminders() {
  const { hour } = zurich();
  if (hour < 9) return;
  const waiting = await db
    .select({ id: contactThreads.id, reference: contactThreads.reference, topic: contactThreads.topic })
    .from(contactThreads)
    .where(and(inArray(contactThreads.status, ["new", "open"]), lt(contactThreads.lastMessageAt, ago(DAY))));
  if (waiting.length === 0) return;
  const byReader = new Map<string, { recipient: Recipient; references: string[] }>();
  for (const topic of new Set(waiting.map((thread) => thread.topic))) {
    const references = waiting.filter((thread) => thread.topic === topic).map((thread) => formatReference(thread.reference));
    for (const recipient of await topicReaders(topic)) {
      const key = recipient.email.toLowerCase();
      const entry = byReader.get(key) ?? { recipient, references: [] };
      entry.references.push(...references);
      byReader.set(key, entry);
    }
  }
  const today = todayInZurich();
  for (const { recipient, references } of byReader.values()) {
    await enqueue("contact.reminder", [recipient], () => ({
      values: { count: String(references.length), references: references.sort().join(", ") },
      path: "/admin/messages",
      dedupe: `contact.reminder:${today}:${recipient.email.toLowerCase()}`,
    }));
  }
  await db.update(contactThreads).set({ remindedAt: new Date() }).where(inArray(contactThreads.id, waiting.map((thread) => thread.id)));
}

/** No visit for 60 days: a friendly nudge, at most once every 90 days. */
async function inactive() {
  const period = Math.floor(Date.now() / (90 * DAY));
  const recipients = await memberRecipients(and(eq(members.status, "active"), lt(members.lastSeenAt, ago(60 * DAY)))!);
  await enqueue("engagement.inactive", recipients, (recipient) => ({
    path: "/",
    dedupe: `engagement.inactive:${recipient.memberId}:${period}`,
  }));
}


/** All periodic scans; one failing never stops the others. */
export async function runSchedules() {
  for (const scan of [
    predictionReminders,
    verifyReminders,
    committeeDigest,
    completeProfile,
    feeReminders,
    feeSeason,
    eventReminders,
    eventThanks,
    monthlyLeaderboard,
    closePredictionSeason,
    contactReminders,
    inactive,
    launchScheduledCampaigns,
  ]) {
    await scan().catch((error) => console.error(`[mailing] ${scan.name} failed:`, error));
  }
}
