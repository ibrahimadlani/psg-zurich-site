import type { MatchTimelineEntry } from "@/db/schema";

/** Fields the match components need; also what /api/v1/matches/live returns (dates as strings). */
export type MatchView = {
  id: string;
  opponent: string;
  opponentLogo: string | null;
  competition: string;
  competitionLogo: string | null;
  round: string | null;
  kickoffAt: Date | string;
  venue: "home" | "away" | "neutral";
  stadium: string | null;
  city: string | null;
  referee?: string | null;
  psgScore: number | null;
  opponentScore: number | null;
  penaltyPsgScore?: number | null;
  penaltyOpponentScore?: number | null;
  status: "scheduled" | "live" | "finished" | "postponed" | "cancelled";
  statusDetail: string | null;
  elapsed: number | null;
  timeline?: MatchTimelineEntry[] | null;
};

export const PSG = { name: "Paris Saint-Germain", short: "PSG", logo: "/brand/psg-crest.svg" };

/** Both teams in scoreboard order (home first). */
export function sides(match: MatchView) {
  const psg = { ...PSG, isPsg: true, score: match.psgScore, penalties: match.penaltyPsgScore ?? null };
  const opponent = {
    name: match.opponent,
    short: match.opponent,
    logo: match.opponentLogo,
    isPsg: false,
    score: match.opponentScore,
    penalties: match.penaltyOpponentScore ?? null,
  };
  return match.venue === "away" ? ([opponent, psg] as const) : ([psg, opponent] as const);
}

/** PSG's result once the match is over. */
export function outcome(match: MatchView): "win" | "draw" | "loss" | null {
  if (match.status !== "finished" || match.psgScore === null || match.opponentScore === null) return null;
  if (match.psgScore === match.opponentScore) {
    if (match.penaltyPsgScore != null && match.penaltyOpponentScore != null) {
      return match.penaltyPsgScore > match.penaltyOpponentScore ? "win" : "loss";
    }
    return "draw";
  }
  return match.psgScore > match.opponentScore ? "win" : "loss";
}

/** API-Football round names: league matchdays and Champions League phases get a translated label. */
export function roundInfo(
  round: string | null,
): { kind: "matchday" | "leaguePhase"; number: number } | { kind: "other"; label: string } | null {
  if (!round) return null;
  const matchday = round.match(/^Regular Season - (\d+)$/);
  if (matchday) return { kind: "matchday", number: Number(matchday[1]) };
  const phase = round.match(/^League Stage - (\d+)$/);
  if (phase) return { kind: "leaguePhase", number: Number(phase[1]) };
  return { kind: "other", label: round };
}

export const toDate = (value: Date | string) => (value instanceof Date ? value : new Date(value));
