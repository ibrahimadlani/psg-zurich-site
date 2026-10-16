import { and, desc, eq, inArray, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  attendance,
  auditLog,
  avatars,
  contactMessages,
  contactThreads,
  emailJobs,
  events,
  matches,
  members,
  pollOptions,
  polls,
  pollVotes,
  predictionStandings,
  predictions,
  session as sessionTable,
  subscribers,
  user,
} from "@/db/schema";
import { apiHandler } from "@/lib/api";
import { LEGAL } from "@/lib/legal";
import { matchTitle } from "@/lib/matches";
import { requireRole } from "@/lib/permissions";
import { formatChf } from "@/lib/money";
import { formatPaymentReference } from "@/lib/payments/config";
import { memberPayments } from "@/lib/payments/history";
import { methodLabel } from "@/lib/payments/receipts";

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

  const [signUps, myPredictions, votes, history, emails, newsletter, finalTables, conversations] = await Promise.all([
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
    // Frozen tables of past seasons (rank, points, prize handed over).
    memberId
      ? db
          .select({ season: predictionStandings.season, rank: predictionStandings.rank, points: predictionStandings.points, exact: predictionStandings.exact, played: predictionStandings.played, prizeHandedOverAt: predictionStandings.rewardGivenAt })
          .from(predictionStandings)
          .where(eq(predictionStandings.memberId, memberId))
          .orderBy(desc(predictionStandings.season))
      : [],
    // Contact messages (the committee's internal notes are not personal data of the sender).
    memberId
      ? db
          .select({
            threadId: contactThreads.id,
            reference: contactThreads.reference,
            topic: contactThreads.topic,
            status: contactThreads.status,
            startedAt: contactThreads.createdAt,
            author: contactMessages.author,
            body: contactMessages.body,
            at: contactMessages.createdAt,
          })
          .from(contactThreads)
          .innerJoin(contactMessages, eq(contactMessages.threadId, contactThreads.id))
          .where(and(eq(contactThreads.memberId, memberId), inArray(contactMessages.author, ["contact", "committee"])))
          .orderBy(contactThreads.createdAt, contactMessages.createdAt)
      : [],
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
    predictionSeasons: finalTables.map((row) => ({ ...row, season: `${row.season}-${row.season + 1}` })),
    contactMessages: Object.values(
      conversations.reduce<Record<string, { reference: string; topic: string; status: string; startedAt: Date; messages: { from: "you" | "committee"; text: string; at: Date }[] }>>((all, row) => {
        all[row.threadId] ??= { reference: `C-${String(row.reference).padStart(4, "0")}`, topic: row.topic, status: row.status, startedAt: row.startedAt, messages: [] };
        all[row.threadId]!.messages.push({ from: row.author === "contact" ? "you" : "committee", text: row.body, at: row.at });
        return all;
      }, {}),
    ),
    payments: memberId
      ? (await memberPayments(memberId)).map((payment) => ({
          reference: formatPaymentReference(payment.reference),
          kind: payment.kind,
          status: payment.status,
          amount: formatChf(payment.amount),
          method: methodLabel(payment, payment.locale),
          paidAt: payment.paidAt,
          receipt: payment.receiptNumber,
          lines: payment.items.map((item) => ({ description: item.description, quantity: item.quantity, total: formatChf(item.total) })),
          refunds: payment.refunds.map((refund) => ({ amount: formatChf(refund.amount), reason: refund.reason, creditNote: refund.creditNoteNumber })),
          order: payment.order ? { status: payment.order.status, delivery: payment.order.fulfilment, shippingAddress: payment.order.shippingAddress, trackingNumber: payment.order.trackingNumber } : null,
          message: payment.message,
        }))
      : [],
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
