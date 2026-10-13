import "server-only";
import { footballApi, isFootballApiConfigured, PSG_TEAM_ID, type ApiMatch } from "@/lib/football/api";

export type Meeting = {
  id: number;
  date: string;
  competition: string;
  psgHome: boolean;
  psgScore: number;
  opponentScore: number;
  /** Shootout, when the meeting went to penalties. */
  penalties: { psg: number; opponent: number } | null;
};

export type HeadToHead = {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  /** Most recent first. */
  meetings: Meeting[];
};

// Past meetings don't change: one request per match and 12 h at most.
const TTL = 12 * 60 * 60_000;
const cache = new Map<number, { at: number; value: HeadToHead | null }>();

const goals = (pair: ApiMatch["score"]["fullTime"] | undefined, home: boolean) =>
  pair ? ((home ? (pair.home ?? pair.homeTeam) : (pair.away ?? pair.awayTeam)) ?? null) : null;

/** Recomputed from the meetings themselves (the API's aggregates are sometimes empty). */
function summarise(list: ApiMatch[], excludeId: number): HeadToHead | null {
  const meetings: Meeting[] = list
    .filter((match) => match.id !== excludeId && match.status === "FINISHED")
    .flatMap((match) => {
      const psgHome = match.homeTeam.id === PSG_TEAM_ID;
      // Shootouts are added into fullTime: use regular + extra time when the API gives them.
      const scored = match.score.regularTime ?? match.score.fullTime;
      const psg = goals(scored, psgHome);
      const opponent = goals(scored, !psgHome);
      if (psg === null || opponent === null) return [];
      const extraPsg = match.score.regularTime ? (goals(match.score.extraTime, psgHome) ?? 0) : 0;
      const extraOpponent = match.score.regularTime ? (goals(match.score.extraTime, !psgHome) ?? 0) : 0;
      const penaltyPsg = goals(match.score.penalties, psgHome);
      const penaltyOpponent = goals(match.score.penalties, !psgHome);
      return [
        {
          id: match.id,
          date: match.utcDate,
          competition: match.competition.name,
          psgHome,
          psgScore: psg + extraPsg,
          opponentScore: opponent + extraOpponent,
          penalties: penaltyPsg !== null && penaltyOpponent !== null ? { psg: penaltyPsg, opponent: penaltyOpponent } : null,
        },
      ];
    })
    .sort((a, b) => b.date.localeCompare(a.date));
  if (meetings.length === 0) return null;

  const result = (meeting: Meeting) =>
    meeting.psgScore !== meeting.opponentScore
      ? meeting.psgScore > meeting.opponentScore
        ? "win"
        : "loss"
      : meeting.penalties
        ? meeting.penalties.psg > meeting.penalties.opponent
          ? "win"
          : "loss"
        : "draw";
  return {
    played: meetings.length,
    wins: meetings.filter((meeting) => result(meeting) === "win").length,
    draws: meetings.filter((meeting) => result(meeting) === "draw").length,
    losses: meetings.filter((meeting) => result(meeting) === "loss").length,
    goalsFor: meetings.reduce((sum, meeting) => sum + meeting.psgScore, 0),
    goalsAgainst: meetings.reduce((sum, meeting) => sum + meeting.opponentScore, 0),
    meetings,
  };
}

/** Last meetings between PSG and this match's opponent; null when unknown or unreachable. */
export async function getHeadToHead(externalId: number | null, now = Date.now()): Promise<HeadToHead | null> {
  if (externalId === null || !isFootballApiConfigured()) return null;
  const cached = cache.get(externalId);
  if (cached && now - cached.at < TTL) return cached.value;
  try {
    const { matches } = await footballApi<{ matches: ApiMatch[] }>(`/matches/${externalId}/head2head`, { limit: 10 });
    const value = summarise(matches, externalId);
    cache.set(externalId, { at: now, value });
    return value;
  } catch (error) {
    console.error("[football] head-to-head failed:", error);
    // A page without this block beats a broken page; an older answer beats none.
    return cached?.value ?? null;
  }
}
