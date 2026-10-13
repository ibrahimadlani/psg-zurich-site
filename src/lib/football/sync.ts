import "server-only";
import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { matches, predictions, type MatchTimelineEntry } from "@/db/schema";
import { footballApi, PSG_TEAM_ID, type ApiMatch } from "@/lib/football/api";
import { scorePrediction } from "@/lib/football/scoring";
import { onPredictionsScored } from "@/lib/mailing/triggers";

type MatchStatus = (typeof matches.$inferSelect)["status"];

/** Our status and a short code for the UI ("HT" = half-time, "ET", "P"…). */
function statusOf(match: ApiMatch): { status: MatchStatus; code: string } {
  switch (match.status) {
    case "IN_PLAY":
      if (match.score.duration === "PENALTY_SHOOTOUT") return { status: "live", code: "P" };
      if (match.score.duration === "EXTRA_TIME") return { status: "live", code: "ET" };
      return { status: "live", code: "LIVE" };
    case "PAUSED":
      return { status: "live", code: "HT" };
    case "SUSPENDED":
      return { status: "live", code: "SUSP" };
    case "FINISHED":
    case "AWARDED":
      return { status: "finished", code: "FT" };
    case "POSTPONED":
      return { status: "postponed", code: "PST" };
    case "CANCELLED":
      return { status: "cancelled", code: "CANC" };
    default:
      // SCHEDULED, TIMED
      return { status: "scheduled", code: "NS" };
  }
}

/** Season start year: a season runs from July to June. */
export function currentSeason(now = new Date()) {
  return now.getUTCMonth() >= 6 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
}

/** Goals, cards and substitutions (only present with the Deep Data plan). */
function timelineOf(match: ApiMatch): MatchTimelineEntry[] | undefined {
  const side = (teamId: number) => (teamId === PSG_TEAM_ID ? ("psg" as const) : ("opponent" as const));
  const entries: MatchTimelineEntry[] = [
    ...(match.goals ?? []).map((goal) => ({
      minute: goal.minute,
      extra: goal.injuryTime ?? null,
      side: side(goal.team.id),
      type: goal.type === "OWN" ? ("own_goal" as const) : goal.type === "PENALTY" ? ("penalty" as const) : ("goal" as const),
      player: goal.scorer?.name ?? null,
      related: goal.assist?.name ?? null,
    })),
    ...(match.bookings ?? []).map((booking) => ({
      minute: booking.minute,
      extra: null,
      side: side(booking.team.id),
      // A second yellow ("YELLOW_RED") sends the player off: shown as a red card.
      type: booking.card === "YELLOW" ? ("yellow" as const) : ("red" as const),
      player: booking.player?.name ?? null,
      related: null,
    })),
    ...(match.substitutions ?? []).map((substitution) => ({
      minute: substitution.minute,
      extra: null,
      side: side(substitution.team.id),
      type: "substitution" as const,
      player: substitution.playerIn?.name ?? null,
      related: substitution.playerOut?.name ?? null,
    })),
  ];
  if (entries.length === 0) return undefined;
  return entries.sort((a, b) => a.minute - b.minute || (a.extra ?? 0) - (b.extra ?? 0));
}

/** "REGULAR_SEASON:9", "LEAGUE_STAGE:3", "LAST_16"… (read back by roundInfo in the UI). */
function roundOf(match: ApiMatch) {
  if (!match.stage) return null;
  const withMatchday = match.stage === "REGULAR_SEASON" || match.stage === "LEAGUE_STAGE" || match.stage === "GROUP_STAGE";
  return (withMatchday && match.matchday ? `${match.stage}:${match.matchday}` : match.stage).slice(0, 80);
}

/** Row values for a match, seen from PSG's side. */
function toMatchValues(match: ApiMatch) {
  const psgHome = match.homeTeam.id === PSG_TEAM_ID;
  const opponent = psgHome ? match.awayTeam : match.homeTeam;
  const sides = (pair: ApiMatch["score"]["fullTime"] | undefined): [number | null, number | null] => {
    if (!pair) return [null, null];
    const home = pair.home ?? pair.homeTeam ?? null;
    const away = pair.away ?? pair.awayTeam ?? null;
    return psgHome ? [home, away] : [away, home];
  };
  const { status, code } = statusOf(match);
  const { score } = match;

  // fullTime adds up regular time, extra time AND the shootout: rebuild the score without penalties.
  const [regularPsg, regularOpponent] = score.regularTime ? sides(score.regularTime) : sides(score.fullTime);
  const [extraPsg, extraOpponent] = sides(score.extraTime);
  const [penaltyPsg, penaltyOpponent] = sides(score.penalties);
  const [halfTimePsg, halfTimeOpponent] = sides(score.halfTime);
  const played = status === "live" || status === "finished";
  const total = (regular: number | null, extra: number | null) =>
    played ? (regular ?? 0) + (score.regularTime ? (extra ?? 0) : 0) : null;

  const minute = match.minute === null || match.minute === undefined ? null : Number.parseInt(String(match.minute), 10);
  const timeline = timelineOf(match);

  return {
    externalId: match.id,
    season: Number(match.season.startDate.slice(0, 4)),
    opponent: (opponent.shortName || opponent.name).slice(0, 120),
    opponentExternalId: opponent.id,
    opponentLogo: opponent.crest,
    competition: match.competition.name.slice(0, 120),
    competitionLogo: match.competition.emblem,
    round: roundOf(match),
    kickoffAt: new Date(match.utcDate),
    venue: psgHome ? ("home" as const) : ("away" as const),
    stadium: match.venue?.slice(0, 160) ?? null,
    referee: match.referees?.find((referee) => referee.type === "REFEREE")?.name.slice(0, 120) ?? null,
    officials: match.referees?.length
      ? match.referees.map((official) => ({ name: official.name, type: official.type, nationality: official.nationality ?? null }))
      : null,
    psgScore: total(regularPsg, extraPsg),
    opponentScore: total(regularOpponent, extraOpponent),
    // Predictions are scored on the score after 90 minutes.
    regulationPsgScore: status === "finished" ? regularPsg : null,
    regulationOpponentScore: status === "finished" ? regularOpponent : null,
    // Known from half-time on (null before, and for some competitions).
    halfTimePsgScore: played ? halfTimePsg : null,
    halfTimeOpponentScore: played ? halfTimeOpponent : null,
    penaltyPsgScore: penaltyPsg,
    penaltyOpponentScore: penaltyOpponent,
    status,
    statusDetail: code,
    elapsed: status === "live" && Number.isFinite(minute) ? minute : null,
    ...(timeline ? { timeline } : {}),
    syncedAt: new Date(),
  };
}

async function upsertMatches(list: ApiMatch[]) {
  for (const match of list) {
    const values = toMatchValues(match);
    await db
      .insert(matches)
      .values({ id: crypto.randomUUID(), ...values })
      .onDuplicateKeyUpdate({ set: values });
    if (values.status === "finished") await scoreMatchPredictions(values.externalId);
  }
}

/** Whole season of PSG matches (one request). */
export async function syncSeason(season = currentSeason()) {
  const { matches: list } = await footballApi<{ matches: ApiMatch[] }>(`/teams/${PSG_TEAM_ID}/matches`, { season });
  await upsertMatches(list);
  return list.length;
}

/** One match: score, minute, status (and timeline with Deep Data). */
export async function syncMatch(externalId: number) {
  const match = await footballApi<ApiMatch>(`/matches/${externalId}`);
  await upsertMatches([match]);
}

/** Points of every prediction on a finished match (idempotent). */
export async function scoreMatchPredictions(externalId: number) {
  const [match] = await db.select({ id: matches.id }).from(matches).where(eq(matches.externalId, externalId));
  if (match) await scorePredictionsForMatch(match.id);
}

/** Same, by our match id (matches entered by hand have no external id). */
export async function scorePredictionsForMatch(matchId: string) {
  const [match] = await db
    .select({ psg: matches.regulationPsgScore, opponent: matches.regulationOpponentScore })
    .from(matches)
    .where(and(eq(matches.id, matchId), isNotNull(matches.regulationPsgScore)));
  if (!match || match.psg === null || match.opponent === null) return;
  const result = { psg: match.psg, opponent: match.opponent };

  const rows = await db.select().from(predictions).where(eq(predictions.matchId, matchId));
  for (const row of rows) {
    const points = scorePrediction({ psg: row.psgScore, opponent: row.opponentScore }, result);
    if (row.points !== points) await db.update(predictions).set({ points }).where(eq(predictions.id, row.id));
  }
  // "Your points" email, once per match and member.
  await onPredictionsScored(matchId);
}
