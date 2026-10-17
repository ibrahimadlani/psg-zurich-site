import "server-only";
import { and, count, eq, gte, isNotNull } from "drizzle-orm";
import { communityStats } from "@/components/matches/prediction-card";
import { db } from "@/db";
import { events, members, predictions, type Locale } from "@/db/schema";
import { eventAccess, isDuesPaid, type EventAccess } from "@/lib/dues";
import { eventParticipants, getEventsWithAttendance, upcomingEvents } from "@/lib/events";
import { getLeaderboard, seasonBounds, seasonOf } from "@/lib/leaderboard";
import { closestMatch, getSeasonMatches, isPredictionOpen } from "@/lib/matches";
import { getCurrentMember } from "@/lib/members";
import { getNewsList } from "@/lib/news";
import { getNotifications } from "@/lib/notification-feed";
import { getSession } from "@/lib/permissions";
import { memberPolls } from "@/lib/polls";

/*
 * Everything the home page shows, gathered in one go: the match that matters now (live, next or
 * last), the next club event, the latest articles — and for members, what changed since their
 * last visit, their rank and what is left to do.
 */

export type HomeViewer = Awaited<ReturnType<typeof homeViewer>>;

export async function homeViewer() {
  const [session, member] = await Promise.all([getSession(), getCurrentMember()]);
  const access: EventAccess = eventAccess(Boolean(session), member);
  return { session, member, access };
}

/** The part every variant needs: matches, next event, articles. */
export async function homeBasics(viewer: HomeViewer, locale: Locale) {
  const { member, access } = viewer;
  const [season, news, upcoming] = await Promise.all([
    getSeasonMatches(),
    getNewsList(locale),
    getEventsWithAttendance(upcomingEvents(), member?.id ?? null),
  ]);
  const live = season.filter((match) => match.status === "live");
  const featured = closestMatch(season);
  // The next match to predict (may differ from the featured one when the last match was closer).
  const next = season.find((match) => isPredictionOpen(match)) ?? null;
  const focus = live[0] ?? next ?? featured?.match ?? null;
  const event = upcoming[0] ?? null;
  // The watch party of the focus match, when there is one.
  const matchEvent = focus ? (upcoming.find((item) => item.match?.id === focus.id) ?? null) : null;
  const [stats, participants, matchParticipants] = await Promise.all([
    focus ? communityStats(focus.id) : null,
    // Who comes is for members whose fee is paid (as on the event page).
    event && access === "full" ? eventParticipants(event.id) : [],
    matchEvent && access === "full" && matchEvent.id !== event?.id ? eventParticipants(matchEvent.id) : [],
  ]);
  const lastResult = [...season].reverse().find((match) => match.status === "finished") ?? null;
  return {
    season,
    live,
    featured,
    next,
    focus,
    lastResult,
    stats,
    event,
    matchEvent,
    participants,
    matchParticipants: matchEvent?.id === event?.id ? participants : matchParticipants,
    news,
  };
}

/** Members: since the last visit, rank of the season, what is left to do. */
export async function homeMemberExtras(viewer: HomeViewer, locale: Locale, basics: Awaited<ReturnType<typeof homeBasics>>) {
  const { session, member } = viewer;
  if (!session || !member) return null;
  const active = member.status === "active";
  const [feed, board, polls, myPrediction] = await Promise.all([
    getNotifications(session.user.id, locale, { history: true }),
    active ? getLeaderboard("season", member.id) : [],
    active ? memberPolls(member.id) : [],
    active && basics.next
      ? db
          .select()
          .from(predictions)
          .where(and(eq(predictions.memberId, member.id), eq(predictions.matchId, basics.next.id)))
          .then((rows) => rows[0] ?? null)
      : null,
  ]);
  const me = board.find((row) => row.memberId === member.id) ?? null;
  const event = basics.event;
  const todo = [
    ...(active && basics.next && !myPrediction ? [{ kind: "predict" as const, href: `/matchs/${basics.next.id}`, opponent: basics.next.opponent }] : []),
    ...(active && !isDuesPaid(member) ? [{ kind: "dues" as const, href: "/cotisation" }] : []),
    ...(isDuesPaid(member) && event && !event.myStatus && (event.capacity === null || event.registered < event.capacity)
      ? [{ kind: "signUp" as const, href: `/evenements/${event.id}`, title: event.title }]
      : []),
    ...polls.filter((poll) => poll.votingOpen && !poll.myOption).map((poll) => ({ kind: "vote" as const, href: "/espace-membre", title: poll.question })),
  ];
  return {
    // When the page was made: the feed's "today / this week" buckets count from here.
    at: Date.now(),
    feed,
    unread: feed.items.filter((item) => item.unread),
    board: { top: board.slice(0, 3), me, total: board.length },
    todo,
    myPrediction,
  };
}

/** Visitors: a few numbers that say the club is alive. */
export async function clubFigures() {
  const { start } = seasonBounds(seasonOf());
  const [[membersRow], [eventsRow], [predictionsRow]] = await Promise.all([
    db.select({ value: count() }).from(members).where(eq(members.status, "active")),
    db.select({ value: count() }).from(events).where(gte(events.startsAt, start)),
    db.select({ value: count() }).from(predictions).where(isNotNull(predictions.createdAt)),
  ]);
  return { members: membersRow?.value ?? 0, events: eventsRow?.value ?? 0, predictions: predictionsRow?.value ?? 0 };
}
