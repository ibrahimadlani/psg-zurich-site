import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { attendance, emailJobs, events, matches, members, predictions, user } from "@/db/schema";
import { isDuesPaid, seasonEnd } from "@/lib/dues";

type Job = typeof emailJobs.$inferSelect;

const DAY = 24 * 60 * 60 * 1000;

/**
 * Checked right before sending: the situation may have changed since the email was queued
 * (fee paid, sign-up cancelled, prediction made…). False → the email is skipped.
 */
export async function stillRelevant(job: Job): Promise<boolean> {
  const key = job.automationKey;
  if (!key || !job.memberId) return true;
  const ids = job.payload.values;
  const [member] = await db.select().from(members).where(eq(members.id, job.memberId));
  if (!member) return false;

  switch (key) {
    case "membership.verifyReminder": {
      const [account] = await db.select({ verified: user.emailVerified }).from(user).where(eq(user.id, member.userId));
      return account ? !account.verified : false;
    }
    case "membership.completeProfile":
      return member.status === "active" && !member.phone && !member.address;
    case "fee.reminder":
    case "fee.expired":
      return member.status === "active" && !isDuesPaid(member);
    case "fee.renewal":
      // Already paid for the next season: nothing to remind.
      return member.status === "active" && (member.expiresOn ?? "") <= seasonEnd();
    case "event.new":
    case "event.almostFull":
    case "event.reminder": {
      if (!isDuesPaid(member) || !ids.eventId) return false;
      const [event] = await db.select({ startsAt: events.startsAt }).from(events).where(eq(events.id, ids.eventId));
      if (!event || event.startsAt.getTime() < Date.now()) return false;
      const [signup] = await db
        .select({ status: attendance.status })
        .from(attendance)
        .where(and(eq(attendance.eventId, ids.eventId), eq(attendance.memberId, member.id)));
      // Reminder: only if still signed up; the others: only if not signed up yet.
      return key === "event.reminder" ? signup?.status === "registered" : !signup || signup.status === "cancelled";
    }
    case "prediction.reminder": {
      if (member.status !== "active" || !ids.matchId) return false;
      const [match] = await db.select({ kickoffAt: matches.kickoffAt }).from(matches).where(eq(matches.id, ids.matchId));
      if (!match || match.kickoffAt.getTime() < Date.now()) return false;
      const [made] = await db
        .select({ id: predictions.id })
        .from(predictions)
        .where(and(eq(predictions.matchId, ids.matchId), eq(predictions.memberId, member.id)));
      return !made;
    }
    case "engagement.inactive":
      return member.status === "active" && (!member.lastSeenAt || member.lastSeenAt.getTime() < Date.now() - 60 * DAY);
    default:
      return true;
  }
}
