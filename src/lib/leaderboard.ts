import "server-only";
import { and, desc, eq, gte, isNotNull, lt, max, sql } from "drizzle-orm";
import { db } from "@/db";
import { matches, members, predictions } from "@/db/schema";

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

/**
 * Ranking of active members on scored predictions: points, then exact scores.
 * Members who hide themselves are left out, except for their own row (`viewerId`).
 */
export async function getLeaderboard(
  period: "season" | "month",
  viewerId: string | null = null,
  /** Another month than the current one (monthly recap email). */
  bounds = currentMonthBounds(),
) {
  const [latest] = await db.select({ season: max(matches.season) }).from(matches);
  const { start, end } = bounds;
  const periodFilter =
    period === "month"
      ? and(gte(matches.kickoffAt, start), lt(matches.kickoffAt, end))
      : latest?.season
        ? eq(matches.season, latest.season)
        : undefined;

  const rows = await db
    .select({
      memberId: members.id,
      firstName: members.firstName,
      lastName: members.lastName,
      nickname: members.nickname,
      hidden: members.hideFromLeaderboard,
      points: sql<number>`SUM(${predictions.points})`.mapWith(Number),
      exact: sql<number>`SUM(${predictions.points} = 3)`.mapWith(Number),
      played: sql<number>`COUNT(*)`.mapWith(Number),
    })
    .from(predictions)
    .innerJoin(members, eq(members.id, predictions.memberId))
    .innerJoin(matches, eq(matches.id, predictions.matchId))
    .where(and(eq(members.status, "active"), isNotNull(predictions.points), periodFilter))
    .groupBy(members.id, members.firstName, members.lastName, members.nickname, members.hideFromLeaderboard)
    .orderBy(desc(sql`SUM(${predictions.points})`), desc(sql`SUM(${predictions.points} = 3)`));

  // Same points and exact scores = same rank. Hidden members still count for the ranks.
  let rank = 0;
  return rows
    .map((row, index) => {
      const previous = rows[index - 1];
      if (!previous || previous.points !== row.points || previous.exact !== row.exact) rank = index + 1;
      return { ...row, rank, name: displayName(row.firstName, row.lastName, row.nickname) };
    })
    .filter((row) => !row.hidden || row.memberId === viewerId);
}
