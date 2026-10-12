import { connection } from "next/server";
import { buildCalendar, icsResponse, type IcsEvent } from "@/lib/ics";
import { ESTIMATED_DURATION_MS, getSeasonMatches, matchScore, matchTitle } from "@/lib/matches";

/** Subscribable calendar: PSG matches of the season (club events are for members only). */
export async function GET(request: Request) {
  await connection();
  const origin = new URL(request.url).origin;
  const seasonMatches = await getSeasonMatches();

  const entries: IcsEvent[] = [
    ...seasonMatches.map((match) => ({
      uid: `match-${match.id}@psg-zurich.ch`,
      start: match.kickoffAt,
      end: new Date(match.kickoffAt.getTime() + ESTIMATED_DURATION_MS),
      summary: `${matchScore(match) ? `${matchTitle(match)} ${matchScore(match)}` : matchTitle(match)} · ${match.competition}`,
      location: [match.stadium, match.city].filter(Boolean).join(", "),
      url: `${origin}/fr/matchs/${match.id}`,
      updatedAt: match.updatedAt,
      cancelled: match.status === "cancelled",
    })),
  ];
  return icsResponse(buildCalendar({ name: "PSG Zurich", events: entries }));
}
