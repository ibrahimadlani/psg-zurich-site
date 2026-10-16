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
  date: "samedi 17 octobre, 20:30",
  place: "Bar Le Parisien",
  left: "3",
  match: "PSG – Lens",
  competition: "Ligue 1",
  time: "samedi 17 octobre, 21:00",
  score: "2 – 1",
  prediction: "2 – 1",
  points: "3",
  month: "septembre 2026",
  rank: "2",
  total: "14",
  season: "2026-2027",
  podium: "1. Léa Martin (64 pts) · 2. Tom Berger (61 pts) · 3. Noa Keller (58 pts)",
  reference: "C-0042",
  topic: "partnership",
  email: "lea.martin@example.ch",
  organisation: "Bar Le Parisien",
  followUp: "no",
  references: "C-0040, C-0041",
};

/** Someone's message, for the preview of the emails that quote one (contact). */
export const SAMPLE_QUOTE: Record<string, string> = {
  fr: "Bonjour,\n\nNous aimerions accueillir vos watch parties au bar cette saison. Pouvons-nous en parler ?\n\nLéa",
  en: "Hello,\n\nWe'd love to host your watch parties at the bar this season. Can we talk about it?\n\nLéa",
  de: "Hallo\n\nWir würden eure Watch-Partys diese Saison gerne in unserer Bar empfangen. Können wir darüber reden?\n\nLéa",
};

/** An event, for the badge and date above the heading of event emails (preview). */
export const SAMPLE_EVENT = { type: "watch_party", startsAt: "2026-10-17T18:30:00.000Z" };
