import "server-only";
import { LEGAL } from "@/lib/legal";

/** Example values for the preview and the test sends of the admin. */
export const SAMPLE_VALUES: Record<string, string> = {
  firstName: "Noa",
  name: "Léa Martin",
  city: "Zurich",
  number: "PSGZ-0042",
  count: "2",
  names: "Léa Martin, Tom Berger",
  fee: LEGAL.statutes.fee,
  until: "30 juin 2027",
  event: "Watch party PSG – Lens",
  date: "samedi 18 octobre, 20:30",
  place: "Bar Le Parisien",
  left: "3",
  match: "PSG – Lens",
  competition: "Ligue 1",
  time: "samedi 18 octobre, 21:00",
  score: "2 – 1",
  prediction: "2 – 1",
  points: "3",
  month: "septembre 2026",
  rank: "2",
  total: "14",
};
