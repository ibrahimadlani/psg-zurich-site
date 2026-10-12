/** Club scoring: exact score 3, right winner (or draw) and goal difference 2, right winner 1. */
export const POINTS = { exact: 3, difference: 2, outcome: 1, miss: 0 } as const;

type Score = { psg: number; opponent: number };

const outcome = ({ psg, opponent }: Score) => Math.sign(psg - opponent);

/** Points of a prediction against the score after 90 minutes. */
export function scorePrediction(prediction: Score, result: Score): number {
  if (prediction.psg === result.psg && prediction.opponent === result.opponent) return POINTS.exact;
  if (outcome(prediction) !== outcome(result)) return POINTS.miss;
  return prediction.psg - prediction.opponent === result.psg - result.opponent ? POINTS.difference : POINTS.outcome;
}
