import "server-only";

const BASE_URL = "https://api.football-data.org";
/** Paris Saint-Germain, men's first team, at football-data.org. */
export const PSG_TEAM_ID = 524;
/** Free plan: 10 requests a minute. Keep one spare for a manual sync. */
const PER_MINUTE = 9;

const recent: number[] = [];

export const isFootballApiConfigured = () => Boolean(process.env.FOOTBALL_DATA_KEY);

export class FootballApiError extends Error {}

// The docs show both spellings ("home" in v4 references, "homeTeam" in the overtime guide).
type Pair = { home?: number | null; away?: number | null; homeTeam?: number | null; awayTeam?: number | null };

/** A v4 match, limited to the fields the site uses. Goals, bookings and substitutions need the Deep Data plan. */
export type ApiMatch = {
  id: number;
  utcDate: string;
  status: string;
  minute?: number | string | null;
  injuryTime?: number | null;
  venue?: string | null;
  matchday: number | null;
  stage: string | null;
  competition: { name: string; emblem: string | null };
  season: { startDate: string };
  homeTeam: { id: number; name: string; shortName: string | null; crest: string | null };
  awayTeam: { id: number; name: string; shortName: string | null; crest: string | null };
  score: {
    duration: string;
    fullTime: Pair;
    halfTime?: Pair;
    regularTime?: Pair;
    extraTime?: Pair;
    penalties?: Pair;
  };
  referees?: { name: string; type: string; nationality?: string | null }[];
  goals?: {
    minute: number;
    injuryTime: number | null;
    type: string;
    team: { id: number };
    scorer: { name: string } | null;
    assist: { name: string } | null;
  }[];
  bookings?: { minute: number; team: { id: number }; player: { name: string } | null; card: string }[];
  substitutions?: {
    minute: number;
    team: { id: number };
    playerOut: { name: string } | null;
    playerIn: { name: string } | null;
  }[];
};

/** GET on football-data.org v4, within the per-minute limit. */
export async function footballApi<T>(path: string, params: Record<string, string | number> = {}): Promise<T> {
  const key = process.env.FOOTBALL_DATA_KEY;
  if (!key) throw new FootballApiError("FOOTBALL_DATA_KEY is not set.");

  const now = Date.now();
  while (recent.length > 0 && now - recent[0]! >= 60_000) recent.shift();
  if (recent.length >= PER_MINUTE) throw new FootballApiError("football-data.org rate limit reached, try again in a minute.");
  recent.push(now);

  const url = new URL(`/v4${path}`, BASE_URL);
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, String(value));
  const response = await fetch(url, { headers: { "X-Auth-Token": key }, cache: "no-store" });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new FootballApiError(`football-data.org ${response.status}: ${body?.message ?? response.statusText}`);
  }
  return (await response.json()) as T;
}
