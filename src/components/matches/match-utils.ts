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

export const KNOWN_STAGES = [
  "FINAL",
  "THIRD_PLACE",
  "SEMI_FINALS",
  "QUARTER_FINALS",
  "LAST_16",
  "LAST_32",
  "PLAYOFFS",
  "QUALIFICATION",
  "GROUP_STAGE",
  "LEAGUE_STAGE",
  "REGULAR_SEASON",
] as const;
type KnownStage = (typeof KNOWN_STAGES)[number];

/**
 * Round stored by the sync: "REGULAR_SEASON:9" (league matchday), "LEAGUE_STAGE:3" /
 * "GROUP_STAGE:2" (European matchday) or a knockout stage such as "LAST_16".
 */
export function roundInfo(
  round: string | null,
): { kind: "matchday" | "leaguePhase"; number: number } | { kind: "stage"; stage: KnownStage } | { kind: "other"; label: string } | null {
  if (!round) return null;
  const [stage, number] = round.split(":");
  if (number && stage === "REGULAR_SEASON") return { kind: "matchday", number: Number(number) };
  if (number) return { kind: "leaguePhase", number: Number(number) };
  if ((KNOWN_STAGES as readonly string[]).includes(round)) return { kind: "stage", stage: round as KnownStage };
  // Unknown stage: "PLAYOFF_ROUND_1" → "Playoff round 1".
  const label = round.toLowerCase().replace(/_/g, " ");
  return { kind: "other", label: label.charAt(0).toUpperCase() + label.slice(1) };
}

export const toDate = (value: Date | string) => (value instanceof Date ? value : new Date(value));
