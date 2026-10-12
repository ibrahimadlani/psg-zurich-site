import "server-only";
import { asc, eq, inArray, max } from "drizzle-orm";
import { db } from "@/db";
import { events, matches } from "@/db/schema";
import { currentSeason } from "@/lib/football/sync";
import type { createMatchSchema } from "@/lib/validators";
import type { z } from "zod";

export type Match = typeof matches.$inferSelect;

export const PSG_NAME = "Paris Saint-Germain";

/** "PSG – Opponent" at home, "Opponent – PSG" away (home team first, as on a scoreboard). */
export function matchTitle(match: Pick<Match, "venue" | "opponent">, psg = PSG_NAME) {
  return match.venue === "away" ? `${match.opponent} – ${psg}` : `${psg} – ${match.opponent}`;
}

/** Score in the same order as matchTitle. */
export function matchScore(match: Pick<Match, "venue" | "psgScore" | "opponentScore">) {
  if (match.psgScore === null || match.opponentScore === null) return null;
  return match.venue === "away" ? `${match.opponentScore}-${match.psgScore}` : `${match.psgScore}-${match.opponentScore}`;
}

/** Predictions stay open until kick-off. */
export const isPredictionOpen = (match: Pick<Match, "status" | "kickoffAt">) =>
  match.status === "scheduled" && match.kickoffAt.getTime() > Date.now();

export const ESTIMATED_DURATION_MS = 2 * 60 * 60 * 1000;

export async function getMatch(id: string) {
  const [row] = await db.select().from(matches).where(eq(matches.id, id));
  return row ?? null;
}

/** Matches of the latest season in the database (every match when none has a season yet). */
export async function getSeasonMatches() {
  const [latest] = await db.select({ season: max(matches.season) }).from(matches);
  return db
    .select()
    .from(matches)
    .where(latest?.season ? eq(matches.season, latest.season) : undefined)
    .orderBy(asc(matches.kickoffAt));
}

/** Club events attached to the given matches. */
export async function getEventsForMatches(matchIds: string[]) {
  if (matchIds.length === 0) return [];
  return db
    .select()
    .from(events)
    .where(inArray(events.matchId, matchIds))
    .orderBy(asc(events.startsAt));
}

/** Row values of a match entered by hand (see createMatchSchema). */
export function manualMatchValues(input: z.infer<typeof createMatchSchema>) {
  const played = input.status === "finished" || input.status === "live";
  const finished = input.status === "finished";
  return {
    opponent: input.opponent,
    opponentLogo: input.opponentLogo ?? null,
    competition: input.competition,
    round: input.round ?? null,
    kickoffAt: input.kickoffAt,
    season: currentSeason(input.kickoffAt),
    venue: input.venue,
    stadium: input.stadium ?? null,
    city: input.city ?? null,
    status: input.status,
    statusDetail: finished ? "FT" : input.status === "live" ? "LIVE" : null,
    psgScore: played ? (input.psgScore ?? 0) : null,
    opponentScore: played ? (input.opponentScore ?? 0) : null,
    // Without extra time, the score after 90 minutes is the final score.
    regulationPsgScore: finished ? (input.regulationPsgScore ?? input.psgScore ?? null) : null,
    regulationOpponentScore: finished ? (input.regulationOpponentScore ?? input.opponentScore ?? null) : null,
    penaltyPsgScore: finished ? (input.penaltyPsgScore ?? null) : null,
    penaltyOpponentScore: finished ? (input.penaltyOpponentScore ?? null) : null,
  };
}
