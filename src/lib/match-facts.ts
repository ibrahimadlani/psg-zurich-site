import type { MatchTimelineEntry } from "@/db/schema";
import type { Match } from "@/lib/matches";

type Side = "psg" | "opponent";
export type Tally = Record<Side, number>;

/** Score of each period, from the scores the API always gives (no timeline needed). */
export function periodScores(match: Match) {
  const { halfTimePsgScore: htPsg, halfTimeOpponentScore: htOpp } = match;
  const { regulationPsgScore: regPsg, regulationOpponentScore: regOpp, psgScore, opponentScore } = match;
  const periods: { key: "first" | "second" | "extra" | "penalties"; psg: number; opponent: number }[] = [];
  if (htPsg !== null && htOpp !== null) {
    periods.push({ key: "first", psg: htPsg, opponent: htOpp });
    if (regPsg !== null && regOpp !== null && regPsg >= htPsg && regOpp >= htOpp) {
      periods.push({ key: "second", psg: regPsg - htPsg, opponent: regOpp - htOpp });
    }
  }
  // Extra time: the final score beyond the 90-minute one.
  if (regPsg !== null && regOpp !== null && psgScore !== null && opponentScore !== null && (psgScore > regPsg || opponentScore > regOpp)) {
    periods.push({ key: "extra", psg: psgScore - regPsg, opponent: opponentScore - regOpp });
  }
  if (match.penaltyPsgScore !== null && match.penaltyOpponentScore !== null) {
    periods.push({ key: "penalties", psg: match.penaltyPsgScore, opponent: match.penaltyOpponentScore });
  }
  return periods;
}

/** How many of each event per team (only what the timeline has). */
export function timelineTallies(entries: MatchTimelineEntry[]) {
  const count = (types: MatchTimelineEntry["type"][]): Tally => ({
    psg: entries.filter((entry) => entry.side === "psg" && types.includes(entry.type)).length,
    opponent: entries.filter((entry) => entry.side === "opponent" && types.includes(entry.type)).length,
  });
  const rows = [
    { key: "goals", tally: count(["goal", "penalty", "own_goal"]) },
    { key: "penalties", tally: count(["penalty", "missed_penalty"]) },
    { key: "yellow", tally: count(["yellow"]) },
    { key: "red", tally: count(["red"]) },
    { key: "substitutions", tally: count(["substitution"]) },
  ] as const;
  // A row of zeros on both sides says nothing: left out.
  return rows.filter((row) => row.tally.psg + row.tally.opponent > 0);
}

export type Period = "first" | "second" | "extra";

/** Timeline split into halves and extra time (45+2 stays in the first half). */
export function timelineByPeriod(entries: MatchTimelineEntry[]) {
  const period = (entry: MatchTimelineEntry): Period => (entry.minute <= 45 ? "first" : entry.minute <= 90 ? "second" : "extra");
  const groups = new Map<Period, MatchTimelineEntry[]>();
  for (const entry of entries) groups.set(period(entry), [...(groups.get(period(entry)) ?? []), entry]);
  return (["first", "second", "extra"] as const).flatMap((key) => (groups.get(key) ? [{ key, entries: groups.get(key)! }] : []));
}

export type PredictionSummary = {
  count: number;
  /** Share of members who saw PSG win, draw or lose (0–1). */
  shares: { win: number; draw: number; loss: number };
  /** Most picked scores, most popular first. */
  topScores: { psg: number; opponent: number; count: number }[];
  /** Once scored: members who found the exact score, and average points. */
  exact: number | null;
  averagePoints: number | null;
};

/** Members' predictions for a match, summed up (no names). */
export function summarisePredictions(
  rows: { psgScore: number; opponentScore: number; points: number | null }[],
  final: { psg: number; opponent: number } | null,
): PredictionSummary | null {
  if (rows.length === 0) return null;
  const share = (test: (row: (typeof rows)[number]) => boolean) => rows.filter(test).length / rows.length;
  const byScore = new Map<string, { psg: number; opponent: number; count: number }>();
  for (const row of rows) {
    const key = `${row.psgScore}-${row.opponentScore}`;
    const current = byScore.get(key) ?? { psg: row.psgScore, opponent: row.opponentScore, count: 0 };
    byScore.set(key, { ...current, count: current.count + 1 });
  }
  const scored = rows.filter((row) => row.points !== null);
  return {
    count: rows.length,
    shares: {
      win: share((row) => row.psgScore > row.opponentScore),
      draw: share((row) => row.psgScore === row.opponentScore),
      loss: share((row) => row.psgScore < row.opponentScore),
    },
    topScores: [...byScore.values()].sort((a, b) => b.count - a.count).slice(0, 3),
    exact: final ? rows.filter((row) => row.psgScore === final.psg && row.opponentScore === final.opponent).length : null,
    averagePoints: scored.length ? scored.reduce((sum, row) => sum + row.points!, 0) / scored.length : null,
  };
}
