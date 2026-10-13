import "server-only";
import { footballApi, isFootballApiConfigured } from "@/lib/football/api";

export type StandingRow = {
  position: number;
  teamId: number;
  name: string;
  crest: string | null;
  played: number;
  won: number;
  draw: number;
  lost: number;
  goalDifference: number;
  points: number;
  /** Last results, oldest first: "W" | "D" | "L". */
  form: string[];
};

type ApiStandings = {
  standings: {
    type: string;
    table: {
      position: number;
      team: { id: number; name: string; shortName: string | null; crest: string | null };
      playedGames: number;
      form: string | null;
      won: number;
      draw: number;
      lost: number;
      points: number;
      goalDifference: number;
    }[];
  }[];
};

type ApiResults = {
  matches: {
    utcDate: string;
    homeTeam: { id: number };
    awayTeam: { id: number };
    score: { winner: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null };
  }[];
};

/** Last five results of each team, oldest first (the API leaves "form" empty). */
async function recentForm(code: Competition) {
  const { matches } = await footballApi<ApiResults>(`/competitions/${code}/matches`, { status: "FINISHED" });
  const form = new Map<number, string[]>();
  const add = (team: number, result: string) => form.set(team, [...(form.get(team) ?? []), result].slice(-5));
  for (const match of matches.toSorted((a, b) => a.utcDate.localeCompare(b.utcDate))) {
    const winner = match.score.winner;
    if (!winner) continue;
    add(match.homeTeam.id, winner === "DRAW" ? "D" : winner === "HOME_TEAM" ? "W" : "L");
    add(match.awayTeam.id, winner === "DRAW" ? "D" : winner === "AWAY_TEAM" ? "W" : "L");
  }
  return form;
}

/** Ligue 1 and the Champions League (a single 36-team table in the league phase). */
export type Competition = "FL1" | "CL";

// Two requests per competition and half hour at most, whoever visits: well within 10 requests a minute.
const TTL = 30 * 60_000;
const cache = new Map<Competition, { at: number; rows: StandingRow[] }>();
const inflight = new Map<Competition, Promise<StandingRow[] | null>>();

async function fetchStandings(code: Competition): Promise<StandingRow[] | null> {
  try {
    const [data, form] = await Promise.all([
      footballApi<ApiStandings>(`/competitions/${code}/standings`),
      // The table is still worth showing without the form.
      recentForm(code).catch(() => new Map<number, string[]>()),
    ]);
    const total = data.standings.find((standing) => standing.type === "TOTAL") ?? data.standings[0];
    if (!total) return cache.get(code)?.rows ?? null;
    const rows = total.table.map((row) => ({
      position: row.position,
      teamId: row.team.id,
      name: row.team.shortName || row.team.name,
      crest: row.team.crest,
      played: row.playedGames,
      won: row.won,
      draw: row.draw,
      lost: row.lost,
      goalDifference: row.goalDifference,
      points: row.points,
      // When the API gives it, the most recent comes first.
      form: row.form ? row.form.split(",").filter(Boolean).reverse() : (form.get(row.team.id) ?? []),
    }));
    cache.set(code, { at: Date.now(), rows });
    return rows;
  } catch (error) {
    console.error(`[football] ${code} standings failed:`, error);
    // An old table beats no table.
    return cache.get(code)?.rows ?? null;
  } finally {
    inflight.delete(code);
  }
}

/** Current table of a competition, cached in memory; null when the API is not set up or unreachable. */
export async function getStandings(code: Competition, now: number = Date.now()): Promise<StandingRow[] | null> {
  if (!isFootballApiConfigured()) return null;
  const cached = cache.get(code);
  if (cached && now - cached.at < TTL) return cached.rows;
  const request = inflight.get(code) ?? fetchStandings(code);
  inflight.set(code, request);
  return request;
}

/** Table a match belongs to, from its competition name (null: cup, friendly…). */
export function competitionCode(competition: string): Competition | null {
  if (/^ligue 1/i.test(competition)) return "FL1";
  if (/champions league/i.test(competition)) return "CL";
  return null;
}
