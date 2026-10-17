import "server-only";
import { and, asc, desc, eq, gt, gte, inArray, isNotNull, lte, max, count } from "drizzle-orm";
import { db } from "@/db";
import {
  contactMessages,
  contactThreads,
  events,
  matches,
  members,
  predictions,
  user,
  type Locale,
} from "@/db/schema";
import { formatReference, visibleTopics } from "@/lib/contact";
import { isDuesPaid } from "@/lib/dues";
import { getNewsList } from "@/lib/news";

/*
 * The bell's feed is computed from what already exists (articles, events, matches,
 * predictions, membership); nothing is stored per notification. Items newer than
 * members.notifications_seen_at count as unread. The member can clean the list: "clear all"
 * hides everything up to that moment (notifications_cleared_at), and single items are
 * dismissed by id (notifications_dismissed).
 */

export type NotificationItem =
  | { id: string; kind: "article"; at: string; href: string; title: string }
  | { id: string; kind: "event"; at: string; href: string; title: string }
  | {
      id: string;
      kind: "prediction";
      at: string;
      href: string;
      opponent: string;
    }
  | {
      id: string;
      kind: "points";
      at: string;
      href: string;
      opponent: string;
      points: number;
    }
  | { id: string; kind: "membership"; at: string; href: string }
  /** Committee: contact messages nobody opened yet. */
  | { id: string; kind: "contactInbox"; at: string; href: string; count: number }
  /** Member: the committee answered one of their messages. */
  | { id: string; kind: "contactReply"; at: string; href: string; reference: string };

const DAY = 24 * 60 * 60 * 1000;
/** How far back the feed looks. */
const WINDOW = 30 * DAY;
/** A match shows up as "prediction to make" this long before kick-off. */
const PREDICTION_LEAD = 4 * DAY;
/** Points are given once the match is over: about two hours after kick-off. */
const MATCH_LENGTH = 2 * 60 * 60 * 1000;
const LIMIT = 15;

/** `history`: the home page's timeline, which keeps what was cleared from the bell. */
export async function getNotifications(userId: string, locale: Locale, { history = false }: { history?: boolean } = {}) {
  const now = new Date();
  const since = new Date(now.getTime() - WINDOW);

  const [member] = await db
    .select({
      id: members.id,
      status: members.status,
      joinedOn: members.joinedOn,
      expiresOn: members.expiresOn,
      seenAt: members.notificationsSeenAt,
      clearedAt: members.notificationsClearedAt,
      dismissed: members.notificationsDismissed,
    })
    .from(members)
    .where(eq(members.userId, userId));
  const active = member?.status === "active";
  const [account] = await db.select({ role: user.role }).from(user).where(eq(user.id, userId));
  const topics = visibleTopics(account?.role);
  const paid = isDuesPaid(member);

  const [news, newEvents, nextMatches, scored, inbox, replies] = await Promise.all([
    getNewsList(locale),
    // Club events are for members whose fee is paid.
    paid
      ? db
          .select({
            id: events.id,
            title: events.title,
            createdAt: events.createdAt,
          })
          .from(events)
          .where(and(gt(events.startsAt, now), gte(events.createdAt, since)))
          .orderBy(desc(events.createdAt))
      : [],
    active
      ? db
          .select({
            id: matches.id,
            opponent: matches.opponent,
            kickoffAt: matches.kickoffAt,
            predicted: predictions.id,
          })
          .from(matches)
          .leftJoin(
            predictions,
            and(
              eq(predictions.matchId, matches.id),
              eq(predictions.memberId, member.id),
            ),
          )
          .where(
            and(
              eq(matches.status, "scheduled"),
              gt(matches.kickoffAt, now),
              lte(matches.kickoffAt, new Date(now.getTime() + PREDICTION_LEAD)),
            ),
          )
          .orderBy(asc(matches.kickoffAt))
      : [],
    active
      ? db
          .select({
            id: matches.id,
            opponent: matches.opponent,
            kickoffAt: matches.kickoffAt,
            points: predictions.points,
          })
          .from(predictions)
          .innerJoin(matches, eq(matches.id, predictions.matchId))
          .where(
            and(
              eq(predictions.memberId, member.id),
              isNotNull(predictions.points),
              gte(matches.kickoffAt, since),
              lte(matches.kickoffAt, now),
            ),
          )
          .orderBy(desc(matches.kickoffAt))
      : [],
    topics.length
      ? db
          .select({ value: count(), at: max(contactThreads.lastMessageAt) })
          .from(contactThreads)
          .where(and(eq(contactThreads.status, "new"), inArray(contactThreads.topic, topics)))
      : [],
    member
      ? db
          .select({ id: contactMessages.id, threadId: contactThreads.id, reference: contactThreads.reference, createdAt: contactMessages.createdAt })
          .from(contactMessages)
          .innerJoin(contactThreads, eq(contactThreads.id, contactMessages.threadId))
          .where(and(eq(contactThreads.memberId, member.id), eq(contactMessages.author, "committee"), gte(contactMessages.createdAt, since)))
          .orderBy(desc(contactMessages.createdAt))
      : [],
  ]);

  const items: NotificationItem[] = [
    ...news
      .filter((post) => post.publishedAt && post.publishedAt >= since)
      .map((post) => ({
        id: `article:${post.id}`,
        kind: "article" as const,
        at: post.publishedAt!.toISOString(),
        href: `/news/${post.slug}`,
        title: post.title,
      })),
    ...newEvents.map((event) => ({
      id: `event:${event.id}`,
      kind: "event" as const,
      at: event.createdAt.toISOString(),
      href: `/events/${event.id}`,
      title: event.title,
    })),
    ...nextMatches
      .filter((match) => !match.predicted)
      .map((match) => ({
        id: `prediction:${match.id}`,
        kind: "prediction" as const,
        at: new Date(
          Math.max(
            match.kickoffAt.getTime() - PREDICTION_LEAD,
            since.getTime(),
          ),
        ).toISOString(),
        href: `/matches/${match.id}`,
        opponent: match.opponent,
      })),
    ...scored.map((match) => ({
      id: `points:${match.id}`,
      kind: "points" as const,
      at: new Date(
        Math.min(match.kickoffAt.getTime() + MATCH_LENGTH, now.getTime()),
      ).toISOString(),
      href: `/matches/${match.id}`,
      opponent: match.opponent,
      points: match.points ?? 0,
    })),
  ];

  const waiting = inbox[0];
  if (waiting?.value && waiting.at) {
    items.push({ id: `contact-inbox:${waiting.at.getTime()}`, kind: "contactInbox", at: waiting.at.toISOString(), href: "/admin/messages", count: waiting.value });
  }
  // The latest answer of each conversation.
  const answered = new Set<string>();
  for (const reply of replies) {
    if (answered.has(reply.threadId)) continue;
    answered.add(reply.threadId);
    items.push({
      id: `contact-reply:${reply.id}`,
      kind: "contactReply",
      at: reply.createdAt.toISOString(),
      href: `/member/messages/${reply.threadId}`,
      reference: formatReference(reply.reference),
    });
  }

  if (active && member.joinedOn) {
    const joined = new Date(`${member.joinedOn}T00:00:00Z`);
    if (joined >= since) {
      items.push({
        id: "membership",
        kind: "membership",
        at: joined.toISOString(),
        href: "/member",
      });
    }
  }

  const clearedAt = member?.clearedAt?.toISOString() ?? null;
  const dismissed = new Set(member?.dismissed ?? []);
  const sorted = items
    .filter((item) => history || ((!clearedAt || item.at > clearedAt) && !dismissed.has(item.id)))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, LIMIT);
  const seenAt = member?.seenAt?.toISOString() ?? null;
  return {
    items: sorted.map((item) => ({
      ...item,
      unread: !seenAt || item.at > seenAt,
    })),
    unread: sorted.filter((item) => !seenAt || item.at > seenAt).length,
  };
}

/** Ids kept in the dismissed list: enough to cover the feed's 30 days. */
const DISMISSED_KEPT = 100;

/** "Clear all": what the bell shows now goes away (and counts as read). */
export async function clearNotifications(userId: string) {
  const now = new Date();
  await db
    .update(members)
    .set({ notificationsClearedAt: now, notificationsSeenAt: now, notificationsDismissed: [] })
    .where(eq(members.userId, userId));
}

/** One item removed from the bell. */
export async function dismissNotification(userId: string, id: string) {
  const [member] = await db.select({ dismissed: members.notificationsDismissed }).from(members).where(eq(members.userId, userId));
  if (!member) return;
  const kept = [id, ...(member.dismissed ?? []).filter((other) => other !== id)].slice(0, DISMISSED_KEPT);
  await db.update(members).set({ notificationsDismissed: kept }).where(eq(members.userId, userId));
}

/** The member opened the bell: everything shown so far is now read. */
export async function markNotificationsSeen(userId: string) {
  await db
    .update(members)
    .set({ notificationsSeenAt: new Date() })
    .where(eq(members.userId, userId));
}
