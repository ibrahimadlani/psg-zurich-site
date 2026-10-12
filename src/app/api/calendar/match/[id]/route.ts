import { connection } from "next/server";
import { buildCalendar, icsResponse } from "@/lib/ics";
import { ESTIMATED_DURATION_MS, getEventsForMatches, getMatch, matchTitle } from "@/lib/matches";

/** One match and its club events, as a .ics file ("Add to my calendar"). */
export async function GET(request: Request, { params }: RouteContext<"/api/calendar/match/[id]">) {
  await connection();
  const { id } = await params;
  const match = await getMatch(id);
  if (!match) return new Response("Not found", { status: 404 });
  const origin = new URL(request.url).origin;
  const clubEvents = (await getEventsForMatches([id])).filter((event) => !event.membersOnly);

  const body = buildCalendar({
    name: matchTitle(match),
    events: [
      {
        uid: `match-${match.id}@psg-zurich.ch`,
        start: match.kickoffAt,
        end: new Date(match.kickoffAt.getTime() + ESTIMATED_DURATION_MS),
        summary: `${matchTitle(match)} · ${match.competition}`,
        location: [match.stadium, match.city].filter(Boolean).join(", "),
        url: `${origin}/fr/matchs/${match.id}`,
      },
      ...clubEvents.map((event) => ({
        uid: `event-${event.id}@psg-zurich.ch`,
        start: event.startsAt,
        end: event.endsAt ?? new Date(event.startsAt.getTime() + ESTIMATED_DURATION_MS),
        summary: `PSG Zurich · ${event.title}`,
        description: event.description,
        location: event.location,
      })),
    ],
  });
  return icsResponse(body, "psg-match.ics");
}
