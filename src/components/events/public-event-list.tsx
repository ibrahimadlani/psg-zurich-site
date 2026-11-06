import { ArrowRight, MapPin } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { publicUpcomingEvents } from "@/lib/events";

/** Dates open to everyone's eyes: title, day and city. The place itself stays for members. */
export async function PublicEventList({ events }: { events: Awaited<ReturnType<typeof publicUpcomingEvents>> }) {
  const [format, types] = await Promise.all([getFormatter(), getTranslations("Events.types")]);
  return (
    <ul className="flex flex-col gap-2.5">
      {events.map((event) => (
        <li key={event.id}>
          <Link href={`/events/${event.id}`} className="group flex items-center gap-4 rounded-[14px] border bg-card p-4 transition-colors hover:border-foreground/30">
            <span className="flex w-12 shrink-0 flex-col items-center leading-none">
              <span className="font-wide text-[9px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">{format.dateTime(event.startsAt, { month: "short" })}</span>
              <span className="font-narrow text-[30px] font-extrabold tabular-nums italic">{format.dateTime(event.startsAt, { day: "numeric" })}</span>
            </span>
            <span className="min-w-0 flex-1 space-y-0.5">
              <span className="block font-wide text-[9px] font-semibold tracking-[0.08em] text-psg-red uppercase">{types(event.type)}</span>
              <span className="block text-[15px] leading-snug font-semibold text-pretty">{event.title}</span>
              <span className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                {format.dateTime(event.startsAt, { weekday: "short", hour: "2-digit", minute: "2-digit" })}
                <span aria-hidden>·</span>
                <MapPin className="size-3" aria-hidden />
                {event.city}
              </span>
            </span>
            <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}
