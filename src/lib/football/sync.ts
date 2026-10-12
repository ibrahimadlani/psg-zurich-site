import "server-only";
import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { matches, predictions, type MatchTimelineEntry } from "@/db/schema";
import { footballApi, PSG_TEAM_ID, type ApiFixture } from "@/lib/football/api";
import { scorePrediction } from "@/lib/football/scoring";

type MatchStatus = (typeof matches.$inferSelect)["status"];

const LIVE = new Set(["1H", "HT", "2H", "ET", "BT", "P", "LIVE", "INT", "SUSP"]);
const FINISHED = new Set(["FT", "AET", "PEN"]);

export function toMatchStatus(code: string): MatchStatus {
  if (LIVE.has(code)) return "live";
  if (FINISHED.has(code)) return "finished";
  if (code === "PST") return "postponed";
  if (code === "CANC" || code === "ABD" || code === "AWD" || code === "WO") return "cancelled";
  return "scheduled";
}

/** Season start year: a season runs from July to June. */
export function currentSeason(now = new Date()) {
  return now.getUTCMonth() >= 6 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
}

function timelineOf(fixture: ApiFixture): MatchTimelineEntry[] | undefined {
  if (!fixture.events) return undefined;
  return fixture.events.flatMap((event): MatchTimelineEntry[] => {
    const type = ((): MatchTimelineEntry["type"] | null => {
      if (event.type === "Goal") {
        if (event.detail === "Own Goal") return "own_goal";
        if (event.detail === "Penalty") return "penalty";
        if (event.detail === "Missed Penalty") return "missed_penalty";
        return "goal";
      }
      if (event.type === "Card") return event.detail.startsWith("Yellow") ? "yellow" : "red";
      if (event.type === "subst") return "substitution";
      if (event.type === "Var") return "var";
      return null;
    })();
    if (!type) return [];
    return [
      {
        minute: event.time.elapsed,
        extra: event.time.extra ?? null,
        side: event.team.id === PSG_TEAM_ID ? "psg" : "opponent",
        type,
        player: event.player.name,
        related: event.assist.name,
      },
    ];
  });
}

/** Row values for a fixture, seen from PSG's side. */
function toMatchValues(fixture: ApiFixture) {
  const psgHome = fixture.teams.home.id === PSG_TEAM_ID;
  const opponent = psgHome ? fixture.teams.away : fixture.teams.home;
  const side = <T>(pair: { home: T; away: T }) => (psgHome ? [pair.home, pair.away] : [pair.away, pair.home]);
  const [psgScore, opponentScore] = side(fixture.goals);
  const [regulationPsg, regulationOpponent] = side(fixture.score.fulltime);
  const [penaltyPsg, penaltyOpponent] = side(fixture.score.penalty);
  const code = fixture.fixture.status.short;
  const timeline = timelineOf(fixture);

  return {
    externalId: fixture.fixture.id,
    season: fixture.league.season,
    opponent: opponent.name.slice(0, 120),
    opponentLogo: opponent.logo,
    competition: fixture.league.name.slice(0, 120),
    competitionLogo: fixture.league.logo,
    round: fixture.league.round?.slice(0, 80) ?? null,
    kickoffAt: new Date(fixture.fixture.date),
    venue: psgHome ? ("home" as const) : ("away" as const),
    stadium: fixture.fixture.venue.name?.slice(0, 160) ?? null,
    city: fixture.fixture.venue.city?.slice(0, 120) ?? null,
    referee: fixture.fixture.referee?.slice(0, 120) ?? null,
    psgScore,
    opponentScore,
    regulationPsgScore: FINISHED.has(code) ? regulationPsg : null,
    regulationOpponentScore: FINISHED.has(code) ? regulationOpponent : null,
    penaltyPsgScore: penaltyPsg,
    penaltyOpponentScore: penaltyOpponent,
    status: toMatchStatus(code),
    statusDetail: code.slice(0, 8),
    elapsed: LIVE.has(code) ? fixture.fixture.status.elapsed : null,
    ...(timeline ? { timeline } : {}),
    syncedAt: new Date(),
  };
}

async function upsertFixtures(fixtures: ApiFixture[]) {
  for (const fixture of fixtures) {
    const values = toMatchValues(fixture);
    await db
      .insert(matches)
      .values({ id: crypto.randomUUID(), ...values })
      .onDuplicateKeyUpdate({ set: values });
    if (values.status === "finished") await scoreMatchPredictions(values.externalId);
  }
}

/** Whole season of PSG fixtures (one request). */
export async function syncSeason(season = currentSeason()) {
  const fixtures = await footballApi<ApiFixture>("/fixtures", { team: PSG_TEAM_ID, season });
  await upsertFixtures(fixtures);
  return fixtures.length;
}

/** One fixture, with its events (live minute, scorers, cards). */
export async function syncFixture(externalId: number) {
  const fixtures = await footballApi<ApiFixture>("/fixtures", { id: externalId });
  await upsertFixtures(fixtures);
}

/** Points of every prediction on a finished match (idempotent). */
export async function scoreMatchPredictions(externalId: number) {
  const [match] = await db
    .select({ id: matches.id, psg: matches.regulationPsgScore, opponent: matches.regulationOpponentScore })
    .from(matches)
    .where(and(eq(matches.externalId, externalId), isNotNull(matches.regulationPsgScore)));
  if (!match || match.psg === null || match.opponent === null) return;
  const result = { psg: match.psg, opponent: match.opponent };

  const rows = await db.select().from(predictions).where(eq(predictions.matchId, match.id));
  for (const row of rows) {
    const points = scorePrediction({ psg: row.psgScore, opponent: row.opponentScore }, result);
    if (row.points !== points) await db.update(predictions).set({ points }).where(eq(predictions.id, row.id));
  }
}
