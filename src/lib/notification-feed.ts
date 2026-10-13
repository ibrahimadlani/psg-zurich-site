import "server-only";
import { and, asc, desc, eq, gt, gte, isNotNull, lte } from "drizzle-orm";
import { db } from "@/db";
import {
  events,
  matches,
  members,
  predictions,
  type Locale,
} from "@/db/schema";
import { isDuesPaid } from "@/lib/dues";
import { getNewsList } from "@/lib/news";

/*
 * The bell's feed is computed from what already exists (articles, events, matches,
 * predictions, membership); nothing is stored per notification. Items newer than
 * members.notifications_seen_at count as unread.
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
  | { id: string; kind: "membership"; at: string; href: string };

const DAY = 24 * 60 * 60 * 1000;
/** How far back the feed looks. */
const WINDOW = 30 * DAY;
/** A match shows up as "prediction to make" this long before kick-off. */
const PREDICTION_LEAD = 4 * DAY;
/** Points are given once the match is over: about two hours after kick-off. */
const MATCH_LENGTH = 2 * 60 * 60 * 1000;
const LIMIT = 15;

export async function getNotifications(userId: string, locale: Locale) {
  const now = new Date();
  const since = new Date(now.getTime() - WINDOW);

  const [member] = await db
    .select({
      id: members.id,
      status: members.status,
      joinedOn: members.joinedOn,
      expiresOn: members.expiresOn,
      seenAt: members.notificationsSeenAt,
    })
    .from(members)
    .where(eq(members.userId, userId));
  const active = member?.status === "active";
  const paid = isDuesPaid(member);

  const [news, newEvents, nextMatches, scored] = await Promise.all([
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
  ]);

  const items: NotificationItem[] = [
    ...news
      .filter((post) => post.publishedAt && post.publishedAt >= since)
      .map((post) => ({
        id: `article:${post.id}`,
        kind: "article" as const,
        at: post.publishedAt!.toISOString(),
        href: `/actualites/${post.slug}`,
        title: post.title,
      })),
    ...newEvents.map((event) => ({
      id: `event:${event.id}`,
      kind: "event" as const,
      at: event.createdAt.toISOString(),
      href: `/evenements/${event.id}`,
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
        href: `/matchs/${match.id}`,
        opponent: match.opponent,
      })),
    ...scored.map((match) => ({
      id: `points:${match.id}`,
      kind: "points" as const,
      at: new Date(
        Math.min(match.kickoffAt.getTime() + MATCH_LENGTH, now.getTime()),
      ).toISOString(),
      href: `/matchs/${match.id}`,
      opponent: match.opponent,
      points: match.points ?? 0,
    })),
  ];

  if (active && member.joinedOn) {
    const joined = new Date(`${member.joinedOn}T00:00:00Z`);
    if (joined >= since) {
      items.push({
        id: "membership",
        kind: "membership",
        at: joined.toISOString(),
        href: "/espace-membre",
      });
    }
  }

  const sorted = items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, LIMIT);
  const seenAt = member?.seenAt?.toISOString() ?? null;
  return {
    items: sorted.map((item) => ({
      ...item,
      unread: !seenAt || item.at > seenAt,
    })),
    unread: sorted.filter((item) => !seenAt || item.at > seenAt).length,
  };
}

/** The member opened the bell: everything shown so far is now read. */
export async function markNotificationsSeen(userId: string) {
  await db
    .update(members)
    .set({ notificationsSeenAt: new Date() })
    .where(eq(members.userId, userId));
}
