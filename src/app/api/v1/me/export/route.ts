import { and, desc, eq, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  attendance,
  auditLog,
  avatars,
  emailJobs,
  events,
  matches,
  members,
  pollOptions,
  polls,
  pollVotes,
  predictions,
  session as sessionTable,
  subscribers,
  user,
} from "@/db/schema";
import { apiHandler } from "@/lib/api";
import { LEGAL } from "@/lib/legal";
import { matchTitle } from "@/lib/matches";
import { requireRole } from "@/lib/permissions";

/**
 * Everything stored about the signed-in person, as a JSON download (right of access and
 * portability, art. 25 and 28 LPD). Kept in step with the privacy policy: each kind of data it
 * lists is here. Never secrets: no password hash, session token or member-card code.
 */
export const GET = apiHandler(async () => {
  const session = await requireRole("member");
  const userId = session.user.id;

  const [account, [profile], [avatar], sessions] = await Promise.all([
    db
      .select({
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })
      .from(user)
      .where(eq(user.id, userId)),
    db.select().from(members).where(eq(members.userId, userId)),
    db.select({ updatedAt: avatars.updatedAt }).from(avatars).where(eq(avatars.userId, userId)),
    db
      .select({
        createdAt: sessionTable.createdAt,
        expiresAt: sessionTable.expiresAt,
        ipAddress: sessionTable.ipAddress,
        userAgent: sessionTable.userAgent,
      })
      .from(sessionTable)
      .where(eq(sessionTable.userId, userId)),
  ]);
  const email = account[0]?.email ?? session.user.email;
  const memberId = profile?.id ?? null;

  const [signUps, myPredictions, votes, history, emails, newsletter] = await Promise.all([
    memberId
      ? db
          .select({ event: events.title, startsAt: events.startsAt, status: attendance.status, signedUpAt: attendance.createdAt, checkedInAt: attendance.checkedInAt })
          .from(attendance)
          .innerJoin(events, eq(events.id, attendance.eventId))
          .where(eq(attendance.memberId, memberId))
          .orderBy(desc(events.startsAt))
      : [],
    memberId
      ? db
          .select({
            opponent: matches.opponent,
            venue: matches.venue,
            competition: matches.competition,
            kickoffAt: matches.kickoffAt,
            psgScore: predictions.psgScore,
            opponentScore: predictions.opponentScore,
            points: predictions.points,
            createdAt: predictions.createdAt,
            updatedAt: predictions.updatedAt,
          })
          .from(predictions)
          .innerJoin(matches, eq(matches.id, predictions.matchId))
          .where(eq(predictions.memberId, memberId))
          .orderBy(desc(matches.kickoffAt))
      : [],
    memberId
      ? db
          .select({ poll: polls.question, answer: pollOptions.label, votedAt: pollVotes.updatedAt })
          .from(pollVotes)
          .innerJoin(polls, eq(polls.id, pollVotes.pollId))
          .innerJoin(pollOptions, eq(pollOptions.id, pollVotes.optionId))
          .where(eq(pollVotes.memberId, memberId))
      : [],
    // What the person did (sign-up and consent included) and what the committee did about
    // their membership. The committee member's own IP address is not theirs to receive.
    db
      .select({ action: auditLog.action, actorId: auditLog.actorId, metadata: auditLog.metadata, ipAddress: auditLog.ipAddress, createdAt: auditLog.createdAt })
      .from(auditLog)
      .where(memberId ? or(eq(auditLog.actorId, userId), and(eq(auditLog.entityType, "member"), eq(auditLog.entityId, memberId))) : eq(auditLog.actorId, userId))
      .orderBy(desc(auditLog.createdAt)),
    db
      .select({ type: emailJobs.automationKey, campaign: emailJobs.campaignId, status: emailJobs.status, createdAt: emailJobs.createdAt, sentAt: emailJobs.sentAt })
      .from(emailJobs)
      .where(memberId ? or(eq(emailJobs.memberId, memberId), eq(emailJobs.toEmail, email)) : eq(emailJobs.toEmail, email))
      .orderBy(desc(emailJobs.createdAt)),
    db.select({ email: subscribers.email, locale: subscribers.locale, status: subscribers.status, consentedAt: subscribers.consentedAt, createdAt: subscribers.createdAt }).from(subscribers).where(eq(subscribers.email, email)),
  ]);

  const body = {
    exportedAt: new Date().toISOString(),
    controller: `${LEGAL.association} — ${LEGAL.email}`,
    account: account[0] ? { ...account[0], profilePicture: avatar ? { updatedAt: avatar.updatedAt } : null } : null,
    memberProfile: profile
      ? {
          firstName: profile.firstName,
          lastName: profile.lastName,
          phone: profile.phone,
          address: profile.address,
          postcode: profile.postcode,
          city: profile.city,
          memberNumber: profile.memberNumber,
          status: profile.status,
          requestedOn: profile.createdAt,
          joinedOn: profile.joinedOn,
          feePaidUntil: profile.expiresOn,
          emailLanguage: profile.locale,
          birthDate: profile.birthDate,
          interests: profile.interests,
          psgTicketing: profile.psgTicketing,
          photoConsent: profile.photoConsent,
          photoConsentAt: profile.photoConsentAt,
          onboardedAt: profile.onboardedAt,
          memberCard: profile.cardToken ? "issued (the QR code value is not exported: it works like a key)" : "not issued yet",
          leaderboard: { nickname: profile.nickname, hidden: profile.hideFromLeaderboard },
          emailPreferences: {
            events: profile.notifyEvents,
            predictionReminders: profile.notifyPredictionReminders,
            results: profile.notifyResults,
            clubNews: profile.notifyNews,
          },
          lastSeenAt: profile.lastSeenAt,
          updatedAt: profile.updatedAt,
        }
      : null,
    eventSignUps: signUps,
    predictions: myPredictions.map(({ opponent, venue, ...row }) => ({ match: matchTitle({ opponent, venue }, "PSG"), ...row })),
    pollVotes: votes,
    newsletter: newsletter[0] ?? null,
    emailsSent: emails.map((row) => ({ type: row.type ?? (row.campaign ? "campaign" : null), status: row.status, queuedAt: row.createdAt, sentAt: row.sentAt })),
    activity: history.map(({ actorId, ipAddress, ...row }) => ({
      ...row,
      by: actorId === userId ? "you" : "committee",
      ipAddress: actorId === userId ? ipAddress : null,
    })),
    sessions,
  };

  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": 'attachment; filename="psg-zurich-mes-donnees.json"',
      "cache-control": "no-store",
    },
  });
});
