import "server-only";
import { and, asc, desc, eq, gte, inArray, isNotNull, lt, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { matches, members, predictionSeasons, predictionStandings, predictions, user } from "@/db/schema";

/** UTC offset of Zurich at `date`, in minutes (+60 in winter, +120 in summer). */
function zurichOffsetMinutes(date: Date) {
  const name = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Zurich", timeZoneName: "longOffset" })
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")?.value;
  const found = name?.match(/GMT([+-])(\d{2}):(\d{2})/);
  return found ? (found[1] === "-" ? -1 : 1) * (Number(found[2]) * 60 + Number(found[3])) : 0;
}

/** First instant of the current month and of the next one, in Zurich time. */
export function currentMonthBounds(now = new Date()) {
  const [year = now.getUTCFullYear(), month = now.getUTCMonth() + 1] = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Zurich",
    year: "numeric",
    month: "2-digit",
  })
    .format(now)
    .split("-")
    .map(Number);
  const at = (y: number, m: number) => {
    const utc = Date.UTC(y, m - 1, 1);
    return new Date(utc - zurichOffsetMinutes(new Date(utc)) * 60_000);
  };
  return { start: at(year, month), end: month === 12 ? at(year + 1, 1) : at(year, month + 1) };
}

/** The member's nickname, else "Jonas P." */
export const displayName = (firstName: string, lastName: string, nickname?: string | null) =>
  nickname || `${firstName} ${lastName.trim().charAt(0).toUpperCase()}${lastName.trim() ? "." : ""}`;

/** Starting year of the club season (1 July – 30 June) that contains `date`, in Zurich. */
export function seasonOf(date = new Date()) {
  const [year = date.getUTCFullYear(), month = date.getUTCMonth() + 1] = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Zurich",
    year: "numeric",
    month: "2-digit",
  })
    .format(date)
    .split("-")
    .map(Number);
  return month >= 7 ? year : year - 1;
}

/** 1 July of `season` to 1 July of the next year, in Zurich time. */
export function seasonBounds(season: number) {
  const at = (year: number) => {
    const utc = Date.UTC(year, 6, 1);
    return new Date(utc - zurichOffsetMinutes(new Date(utc)) * 60_000);
  };
  return { start: at(season), end: at(season + 1) };
}

/** "2026-2027". */
export const seasonLabel = (season: number) => `${season}-${season + 1}`;

export type BoardRow = {
  memberId: string;
  firstName: string;
  lastName: string;
  nickname: string | null;
  hidden: boolean;
  email: string;
  image: string | null;
  points: number;
  exact: number;
  played: number;
  rank: number;
  name: string;
};

const memberColumns = {
  memberId: members.id,
  firstName: members.firstName,
  lastName: members.lastName,
  nickname: members.nickname,
  hidden: members.hideFromLeaderboard,
  email: user.email,
  image: user.image,
};

/** Same points and exact scores = same rank. Hidden members still count for the ranks. */
function ranked<T extends { points: number; exact: number; firstName: string; lastName: string; nickname: string | null }>(rows: T[]) {
  let rank = 0;
  return rows.map((row, index) => {
    const previous = rows[index - 1];
    if (!previous || previous.points !== row.points || previous.exact !== row.exact) rank = index + 1;
    return { ...row, rank, name: displayName(row.firstName, row.lastName, row.nickname) };
  });
}

/** Members who hide themselves are left out, except for their own row (`viewerId`). */
const visibleTo = (viewerId: string | null) => (row: BoardRow) => !row.hidden || row.memberId === viewerId;

/** Live table of active members on scored predictions between two dates, hidden members included. */
async function liveBoard({ start, end }: { start: Date; end: Date }): Promise<BoardRow[]> {
  const rows = await db
    .select({
      ...memberColumns,
      points: sql<number>`SUM(${predictions.points})`.mapWith(Number),
      exact: sql<number>`SUM(${predictions.points} = 3)`.mapWith(Number),
      played: sql<number>`COUNT(*)`.mapWith(Number),
    })
    .from(predictions)
    .innerJoin(members, eq(members.id, predictions.memberId))
    .innerJoin(user, eq(user.id, members.userId))
    .innerJoin(matches, eq(matches.id, predictions.matchId))
    .where(and(eq(members.status, "active"), isNotNull(predictions.points), gte(matches.kickoffAt, start), lt(matches.kickoffAt, end)))
    .groupBy(members.id, members.firstName, members.lastName, members.nickname, members.hideFromLeaderboard, user.email, user.image)
    .orderBy(desc(sql`SUM(${predictions.points})`), desc(sql`SUM(${predictions.points} = 3)`));
  return ranked(rows);
}

/**
 * Ranking on scored predictions: points, then exact scores. "season" is the current club
 * season, live; "month" the current month (or `bounds`, for the monthly recap email).
 */
export async function getLeaderboard(
  period: "season" | "month",
  viewerId: string | null = null,
  bounds = period === "month" ? currentMonthBounds() : seasonBounds(seasonOf()),
) {
  return (await liveBoard(bounds)).filter(visibleTo(viewerId));
}

/** Seasons whose table is frozen, newest first. */
export async function closedSeasons() {
  const rows = await db.select({ season: predictionSeasons.season, closedAt: predictionSeasons.closedAt }).from(predictionSeasons).orderBy(desc(predictionSeasons.season));
  return rows;
}

/** Final table of a closed season, as members see it today (hidden members left out, unless `everyone`, for the committee). */
export async function frozenBoard(season: number, viewerId: string | null = null, everyone = false): Promise<(BoardRow & { rewardGivenAt: Date | null })[]> {
  const rows = await db
    .select({
      ...memberColumns,
      points: predictionStandings.points,
      exact: predictionStandings.exact,
      played: predictionStandings.played,
      rank: predictionStandings.rank,
      rewardGivenAt: predictionStandings.rewardGivenAt,
    })
    .from(predictionStandings)
    .innerJoin(members, eq(members.id, predictionStandings.memberId))
    .innerJoin(user, eq(user.id, members.userId))
    .where(eq(predictionStandings.season, season))
    .orderBy(asc(predictionStandings.rank), asc(members.firstName));
  return rows.map((row) => ({ ...row, name: displayName(row.firstName, row.lastName, row.nickname) })).filter((row) => everyone || visibleTo(viewerId)(row));
}

export type Trophy = { season: number; rank: number };

/** Podium places of past seasons, per member (best first). */
export async function trophiesOf(memberIds: string[]) {
  const map = new Map<string, Trophy[]>();
  if (memberIds.length === 0) return map;
  const rows = await db
    .select({ memberId: predictionStandings.memberId, season: predictionStandings.season, rank: predictionStandings.rank })
    .from(predictionStandings)
    .where(and(inArray(predictionStandings.memberId, memberIds), lte(predictionStandings.rank, 3)))
    .orderBy(desc(predictionStandings.season));
  for (const row of rows) map.set(row.memberId, [...(map.get(row.memberId) ?? []), { season: row.season, rank: row.rank }]);
  return map;
}

/**
 * Freezes the table of a finished season: the ranks of that moment are kept for good, the
 * podium is rewarded. Does nothing for a season already closed or without any scored prediction.
 * Returns the podium when the season has just been closed.
 */
export async function closeSeason(season: number) {
  const [done] = await db.select().from(predictionSeasons).where(eq(predictionSeasons.season, season));
  if (done) return null;
  const board = await liveBoard(seasonBounds(season));
  if (board.length === 0) return null;
  await db.transaction(async (tx) => {
    await tx.insert(predictionSeasons).values({ season, closedAt: new Date() });
    await tx.insert(predictionStandings).values(
      board.map((row) => ({ season, memberId: row.memberId, rank: row.rank, points: row.points, exact: row.exact, played: row.played })),
    );
  });
  return board.filter((row) => row.rank <= 3);
}
