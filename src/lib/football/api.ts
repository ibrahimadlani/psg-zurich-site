import "server-only";

const BASE_URL = "https://v3.football.api-sports.io";
/** Paris Saint-Germain, men's first team, at API-Football. */
export const PSG_TEAM_ID = 85;
/** Free plan: 100 requests a day. Stay below to keep room for manual syncs. */
const DAILY_BUDGET = 90;

let budget = { day: "", used: 0 };

export const isFootballApiConfigured = () => Boolean(process.env.API_FOOTBALL_KEY);

export class FootballApiError extends Error {}

/** Shape of a fixture, limited to the fields the site uses. */
export type ApiFixture = {
  fixture: {
    id: number;
    referee: string | null;
    date: string;
    venue: { name: string | null; city: string | null };
    status: { short: string; elapsed: number | null; extra?: number | null };
  };
  league: { name: string; logo: string | null; season: number; round: string | null };
  teams: {
    home: { id: number; name: string; logo: string | null };
    away: { id: number; name: string; logo: string | null };
  };
  goals: { home: number | null; away: number | null };
  score: {
    fulltime: { home: number | null; away: number | null };
    penalty: { home: number | null; away: number | null };
  };
  events?: {
    time: { elapsed: number; extra: number | null };
    team: { id: number };
    player: { name: string | null };
    assist: { name: string | null };
    type: string;
    detail: string;
  }[];
};

/** GET on API-Football, within the daily budget. */
export async function footballApi<T>(path: string, params: Record<string, string | number>): Promise<T[]> {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) throw new FootballApiError("API_FOOTBALL_KEY is not set.");

  const today = new Date().toISOString().slice(0, 10);
  if (budget.day !== today) budget = { day: today, used: 0 };
  if (budget.used >= DAILY_BUDGET) throw new FootballApiError("Daily API-Football budget reached.");
  budget.used += 1;

  const url = new URL(path, BASE_URL);
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, String(value));
  const response = await fetch(url, { headers: { "x-apisports-key": key }, cache: "no-store" });
  if (!response.ok) throw new FootballApiError(`API-Football ${response.status} on ${path}`);

  const body = (await response.json()) as { response: T[]; errors: unknown };
  // Errors come back with HTTP 200: an object (or array) of messages.
  const errors = body.errors && typeof body.errors === "object" ? Object.values(body.errors) : [];
  if (errors.length > 0) throw new FootballApiError(`API-Football: ${errors.join(" ")}`);
  return body.response;
}

export const footballApiUsage = () => ({ ...budget, budget: DAILY_BUDGET });
