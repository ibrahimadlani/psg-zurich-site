import "server-only";
import { and, eq, gte, inArray, isNotNull, ne, notInArray } from "drizzle-orm";
import { db } from "@/db";
import { attendance, events, matches, members, predictions, user, type Locale } from "@/db/schema";
import { todayInZurich } from "@/lib/dues";
import { matchTitle } from "@/lib/matches";
import { committeeRecipients, emailDate, enqueue, memberRecipients } from "@/lib/mailing/queue";

/*
 * Things happening on the site that queue emails (called by the API routes and auth hooks).
 * Each is fire-and-forget: errors are logged by enqueue, never thrown.
 */

const paidMembers = () => and(eq(members.status, "active"), gte(members.expiresOn, todayInZurich()));

/** Email confirmed: "request received" to the applicant, "new request" to the committee. */
export async function onEmailVerified(userId: string) {
  const [member] = await memberRecipients(and(eq(members.userId, userId), eq(members.status, "pending"))!);
  if (!member) return;
  await enqueue("membership.received", [member], () => ({ dedupe: `membership.received:${member.memberId}` }));
  const [details] = await db
    .select({ firstName: members.firstName, lastName: members.lastName, city: members.city })
    .from(members)
    .where(eq(members.id, member.memberId));
  await enqueue("membership.toCommittee", await committeeRecipients(), (recipient) => ({
    values: { name: `${details?.firstName} ${details?.lastName}`, email: member.email, city: details?.city || "—" },
    path: "/admin/members",
    dedupe: `membership.toCommittee:${member.memberId}:${recipient.email}`,
  }));
}

/** Committee decision. */
export async function onMemberDecision(memberId: string, decision: "approved" | "rejected") {
  const recipients = await memberRecipients(eq(members.id, memberId));
  const [number] = await db.select({ value: members.memberNumber }).from(members).where(eq(members.id, memberId));
  await enqueue(`membership.${decision}`, recipients, () => ({
    values: { number: number?.value ?? "" },
    path: decision === "approved" ? "/member" : undefined,
    // A request can be refused, then accepted on appeal: one email per decision and day.
    dedupe: `membership.${decision}:${memberId}:${todayInZurich()}`,
  }));
}

/** Account gone: the confirmation goes to the address it had. */
export async function onAccountDeleted(email: string, locale: Locale) {
  await enqueue("account.deleted", [{ memberId: null, email, locale, firstName: "" }], () => ({ dedupe: null }));
}

/** Fee recorded by the committee. */
export async function onFeeRecorded(memberId: string, expiresOn: string, receipt?: string) {
  const recipients = await memberRecipients(eq(members.id, memberId));
  await enqueue("fee.receipt", recipients, (recipient) => ({
    values: { until: emailDate(new Date(`${expiresOn}T12:00:00Z`), recipient.locale, false) },
    path: "/member",
    attachment: receipt,
    // One per receipt: a fee cancelled then paid again gets its own email.
    dedupe: `fee.receipt:${memberId}:${expiresOn}${receipt ? `:${receipt}` : ""}`,
  }));
}

const eventValues = (event: typeof events.$inferSelect, locale: Locale) => ({
  eventId: event.id,
  event: event.title,
  date: emailDate(event.startsAt, locale),
  place: event.location ?? event.address ?? "—",
});

/** Kind and date of an event, for the badge above the heading (kept in the email: the event may be gone). */
const eventMeta = (event: typeof events.$inferSelect) => ({ type: event.type, startsAt: event.startsAt.toISOString() });

/** New event (when the admin asked to tell the members): members whose fee is paid. */
export async function onEventCreated(eventId: string) {
  const [event] = await db.select().from(events).where(eq(events.id, eventId));
  if (!event) return;
  const recipients = await memberRecipients(paidMembers()!);
  await enqueue("event.new", recipients, (recipient) => ({
    values: eventValues(event, recipient.locale),
    event: eventMeta(event),
    path: `/events/${event.id}`,
    info: `${emailDate(event.startsAt, recipient.locale)} · ${event.location ?? event.address ?? ""}`,
    dedupe: `event.new:${event.id}:${recipient.memberId}`,
  }));
}

/** Event deleted: its sign-ups (read before the deletion) are told. */
export async function onEventCancelled(event: typeof events.$inferSelect, memberIds: string[]) {
  if (memberIds.length === 0) return;
  const recipients = await memberRecipients(inArray(members.id, memberIds));
  await enqueue("event.cancelled", recipients, (recipient) => ({
    values: eventValues(event, recipient.locale),
    event: eventMeta(event),
    path: "/events",
    dedupe: `event.cancelled:${event.id}:${recipient.memberId}`,
  }));
}

/** A place freed up: the waitlisted member is now in. */
export async function onWaitlistPromoted(memberId: string, eventId: string) {
  const [event] = await db.select().from(events).where(eq(events.id, eventId));
  if (!event) return;
  await enqueue("event.waitlistPromoted", await memberRecipients(eq(members.id, memberId)), (recipient) => ({
    values: eventValues(event, recipient.locale),
    event: eventMeta(event),
    path: `/events/${eventId}`,
    dedupe: `event.waitlistPromoted:${eventId}:${memberId}`,
  }));
}

/** After a sign-up: once 80 % of the places are taken, the members not signed up yet hear it, once. */
export async function onSignUp(eventId: string) {
  const [event] = await db.select().from(events).where(eq(events.id, eventId));
  if (!event?.capacity || event.startsAt.getTime() < Date.now()) return;
  const taken = await db
    .select({ memberId: attendance.memberId })
    .from(attendance)
    .where(and(eq(attendance.eventId, eventId), ne(attendance.status, "cancelled")));
  const registered = taken.length;
  const left = event.capacity - registered;
  if (left <= 0 || left > Math.ceil(event.capacity * 0.2)) return;
  const signedUp = taken.map((row) => row.memberId);
  const recipients = await memberRecipients(
    signedUp.length ? and(paidMembers(), notInArray(members.id, signedUp))! : paidMembers()!,
  );
  await enqueue("event.almostFull", recipients, (recipient) => ({
    values: { ...eventValues(event, recipient.locale), left: String(left) },
    event: eventMeta(event),
    path: `/events/${event.id}`,
    dedupe: `event.almostFull:${event.id}:${recipient.memberId}`,
  }));
}

/** Match scored: each member who predicted gets their points. */
export async function onPredictionsScored(matchId: string) {
  const [match] = await db.select().from(matches).where(eq(matches.id, matchId));
  if (!match || match.regulationPsgScore === null || match.regulationOpponentScore === null) return;
  const rows = await db
    .select({ memberId: predictions.memberId, psg: predictions.psgScore, other: predictions.opponentScore, points: predictions.points })
    .from(predictions)
    .where(and(eq(predictions.matchId, matchId), isNotNull(predictions.points)));
  if (rows.length === 0) return;
  const byMember = new Map(rows.map((row) => [row.memberId, row]));
  const recipients = await memberRecipients(and(eq(members.status, "active"), inArray(members.id, [...byMember.keys()]))!);
  const home = match.venue !== "away";
  const score = (psg: number, other: number) => (home ? `${psg} – ${other}` : `${other} – ${psg}`);
  await enqueue("prediction.result", recipients, (recipient) => {
    const row = byMember.get(recipient.memberId!)!;
    return {
      values: {
        matchId,
        match: matchTitle(match, "PSG"),
        score: score(match.regulationPsgScore!, match.regulationOpponentScore!),
        prediction: score(row.psg, row.other),
        points: String(row.points ?? 0),
      },
      path: "/matches/leaderboard",
      dedupe: `prediction.result:${matchId}:${recipient.memberId}`,
    };
  });
}

/** Account of a member, for the hooks that only know the user. */
export async function userEmailLocale(userId: string) {
  const [row] = await db
    .select({ email: user.email, locale: members.locale })
    .from(user)
    .leftJoin(members, eq(members.userId, user.id))
    .where(eq(user.id, userId));
  return row;
}

/** The committee nudges applicants who have not confirmed their email (once a day at most). */
export async function onVerifyReminder(memberIds: string[]) {
  const recipients = await memberRecipients(and(inArray(members.id, memberIds), eq(members.status, "pending"), eq(user.emailVerified, false))!);
  return enqueue("membership.verifyReminder", recipients, (recipient) => ({
    path: "/login",
    dedupe: `membership.verifyReminder:manual:${recipient.memberId}:${todayInZurich()}`,
  }));
}

/** The committee reminds accepted members that their fee is due (once a day at most). */
export async function onFeeReminder(memberIds: string[], fee: string) {
  const today = todayInZurich();
  const recipients = await memberRecipients(and(inArray(members.id, memberIds), eq(members.status, "active"))!);
  return enqueue("fee.reminder", recipients, (recipient) => ({
    values: { fee },
    path: "/dues",
    dedupe: `fee.reminder:manual:${recipient.memberId}:${today}`,
  }));
}
