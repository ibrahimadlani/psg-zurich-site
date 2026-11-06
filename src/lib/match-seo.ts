import type { Locale } from "@/db/schema";

/*
 * What search engines get from the match pages: a readable address, which pages are open to
 * them, and the guide those pages lead to. No database here (used by client components too).
 */

export type Rivalry = "classique" | "derby";

/** The two matches that are more than a match: against Marseille, and against Paris FC. */
export function rivalryOf(match: { opponent: string }): Rivalry | null {
  if (/marseille/i.test(match.opponent)) return "classique";
  if (/^paris\s*f\.?\s*c\.?$/i.test(match.opponent.trim())) return "derby";
  return null;
}

type Named = { id: string; venue: string; opponent: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const slugify = (text: string) =>
  text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ß/g, "ss")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** "psg-barcelona-8da1ec35": both teams in playing order, then the start of the id. */
export function matchSlug({ id, venue, opponent }: Named) {
  if (!UUID.test(id)) return id;
  const other = slugify(opponent);
  return `${venue === "away" ? `${other}-psg` : `psg-${other}`}-${id.slice(0, 8)}`;
}

export const matchPath = (match: Named) => `/matches/${matchSlug(match)}`;

/** The start of the id in a match's address, or in the id itself. Null when it has neither. */
export function matchKeyOf(param: string) {
  if (UUID.test(param)) return param.slice(0, 8).toLowerCase();
  return /-([0-9a-f]{8})$/.exec(param)?.[1] ?? null;
}

/**
 * The calendar source dates a match at exactly 00:00 UTC until the league fixes its time: that
 * hour is a placeholder, never to be shown as a kick-off.
 */
export function kickoffTimeKnown(match: { status: string; kickoffAt: Date | string }) {
  if (match.status !== "scheduled") return true;
  const at = new Date(match.kickoffAt);
  return at.getUTCHours() !== 0 || at.getUTCMinutes() !== 0;
}

const DAY = 86_400_000;
/** Search engines get a big match from three weeks before it… */
const OPEN_BEFORE = 21 * DAY;
/** …until it should be over (extra time and penalties included)… */
const MATCH_LENGTH = 3 * 3_600_000;

/**
 * Which match pages are offered to search engines. Only the big ones, and only while they have
 * something of their own to say: a page per match of the season, all alike, would be seen as
 * content made at scale. After the match, only with what happened in it.
 */
export function matchIndexable(
  match: { opponent: string; competition: string; status: string; kickoffAt: Date; timeline: unknown[] | null },
  now = new Date(),
) {
  if (match.status === "postponed" || match.status === "cancelled") return false;
  if (!/champions league/i.test(match.competition) && !rivalryOf(match)) return false;
  const kickoff = match.kickoffAt.getTime();
  if (match.status === "finished" || now.getTime() > kickoff + MATCH_LENGTH) return Boolean(match.timeline?.length);
  return now.getTime() >= kickoff - OPEN_BEFORE;
}

/** The guide on watching PSG in Switzerland, in each language. */
export const TV_GUIDE: Record<Locale, string> = {
  fr: "regarder-psg-suisse-tv-streaming",
  en: "watch-psg-in-switzerland-tv-streaming",
  de: "psg-schauen-schweiz-tv-streaming",
};
