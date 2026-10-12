import { eq } from "drizzle-orm";
import { connection } from "next/server";
import { db } from "@/db";
import { events } from "@/db/schema";
import { buildCalendar, icsResponse } from "@/lib/ics";
import { ESTIMATED_DURATION_MS } from "@/lib/matches";
import { getSession } from "@/lib/permissions";

/** One club event as a .ics file ("Add to my calendar"); members-only events need a session. */
export async function GET(request: Request, { params }: RouteContext<"/api/calendar/event/[id]">) {
  await connection();
  const { id } = await params;
  const [event] = await db.select().from(events).where(eq(events.id, id));
  if (!event || (event.membersOnly && !(await getSession()))) return new Response("Not found", { status: 404 });

  const origin = new URL(request.url).origin;
  const body = buildCalendar({
    name: event.title,
    events: [
      {
        uid: `event-${event.id}@psg-zurich.ch`,
        start: event.startsAt,
        end: event.endsAt ?? new Date(event.startsAt.getTime() + ESTIMATED_DURATION_MS),
        summary: `PSG Zurich · ${event.title}`,
        description: event.description,
        location: event.location,
        url: `${origin}/fr/evenements/${event.id}`,
        updatedAt: event.updatedAt,
      },
    ],
  });
  return icsResponse(body, "psg-zurich-evenement.ics");
}
