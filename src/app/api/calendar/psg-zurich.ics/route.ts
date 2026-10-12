import { asc, eq } from "drizzle-orm";
import { connection } from "next/server";
import { db } from "@/db";
import { events } from "@/db/schema";
import { buildCalendar, icsResponse, type IcsEvent } from "@/lib/ics";
import { ESTIMATED_DURATION_MS, getSeasonMatches, matchScore, matchTitle } from "@/lib/matches";

/** Subscribable calendar: PSG matches of the season + public club events. */
export async function GET(request: Request) {
  await connection();
  const origin = new URL(request.url).origin;
  const [seasonMatches, clubEvents] = await Promise.all([
    getSeasonMatches(),
    db.select().from(events).where(eq(events.membersOnly, false)).orderBy(asc(events.startsAt)),
  ]);

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
    ...clubEvents.map((event) => ({
      uid: `event-${event.id}@psg-zurich.ch`,
      start: event.startsAt,
      end: event.endsAt ?? new Date(event.startsAt.getTime() + ESTIMATED_DURATION_MS),
      summary: `PSG Zurich · ${event.title}`,
      description: event.description,
      location: event.location,
      url: `${origin}/fr/evenements/${event.id}`,
      updatedAt: event.updatedAt,
    })),
  ];
  return icsResponse(buildCalendar({ name: "PSG Zurich", events: entries }));
}
