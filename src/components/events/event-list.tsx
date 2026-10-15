import { ArrowRight } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { EventListLink } from "@/components/events/event-list-link";
import { MatchBadge } from "@/components/events/match-badge";
import { PsgBanner } from "@/components/psg-banner";
import type { EventView } from "@/lib/events";
import { cn } from "@/lib/utils";

const label = "font-wide text-[10px] font-semibold tracking-[0.08em] uppercase";

/** Places left, full, or the member's own sign-up — the one line that matters at a glance. */
function Status({ event }: { event: EventView }) {
  const t = useTranslations("Events");
  const full = event.capacity !== null && event.registered >= event.capacity;
  const left = event.capacity === null ? null : Math.max(0, event.capacity - event.registered);
  const [text, tone] =
    event.myStatus === "registered"
      ? [t("registered"), "ok"]
      : event.myStatus === "waitlisted"
        ? [t("waitlisted"), "wait"]
        : full
          ? [t("full"), "full"]
          : [left === null ? t("registeredCount", { count: event.registered }) : t("placesLeft", { count: left }), "open"];
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-full px-2.5 text-[12px] font-medium whitespace-nowrap",
        tone === "ok"
          ? "bg-emerald-600/12 text-emerald-700 dark:text-emerald-400"
          : "bg-foreground/[0.06] text-muted-foreground",
      )}
    >
      {text}
    </span>
  );
}

/** An event: date block, title, time and place, status. The next one is open by default on a computer. */
function EventRow({ event, isDefault = false }: { event: EventView; isDefault?: boolean }) {
  const t = useTranslations("Events");
  const format = useFormatter();
  return (
    <EventListLink
      id={event.id}
      isDefault={isDefault}
      className="rounded-[12px] border bg-card/70 p-3.5 transition-[border-color,background-color,transform] duration-200 hover:border-foreground/30 active:scale-[0.99] data-[selected]:border-foreground/40 data-[selected]:bg-card lg:data-[default]:border-foreground/40 lg:data-[default]:bg-card"
    >
      {/* Open event: the PSG banner in the left margin, as in the menu. */}
      <PsgBanner className="absolute top-1/2 -left-[5px] h-7 w-2.5 -translate-y-1/2 scale-y-0 transition-transform duration-300 ease-out group-data-[selected]:scale-y-100 lg:group-data-[default]:scale-y-100" />
      {/* The next event: the PSG band as a bookmark coming out from behind the card. It rises a
          little above the top edge, a darker fold on its left shows where it bends over, and shadows
          lift it off the card. */}
      {isDefault ? (
        <span
          aria-hidden
          className="absolute -top-1.5 right-4 [filter:drop-shadow(0_1px_1px_rgb(0_0_0/0.35))_drop-shadow(2px_5px_6px_rgb(0_0_0/0.3))]"
        >
          <span className="absolute top-0 -left-1.5 size-1.5 bg-psg-blue brightness-50 [clip-path:polygon(100%_0,100%_100%,0_100%)]" />
          <span className="relative block [clip-path:polygon(0_0,100%_0,100%_100%,50%_80%,0_100%)]">
            <PsgBanner className="h-12 w-5 rounded-none shadow-none" />
            {/* Shading: dark where it bends over the edge, then a light rounding across the band. */}
            <span className="absolute inset-x-0 top-0 h-3 bg-gradient-to-b from-black/50 to-transparent" />
            <span className="absolute inset-0 bg-gradient-to-r from-black/15 via-white/10 to-black/25" />
          </span>
        </span>
      ) : null}
      <span className="flex items-center gap-3.5">
        <span className="flex w-11 shrink-0 flex-col items-center leading-none">
          <span className={cn(label, "text-muted-foreground")}>{format.dateTime(event.startsAt, { weekday: "short" })}</span>
          <span className="font-narrow text-[30px] leading-none font-extrabold tabular-nums italic">
            {format.dateTime(event.startsAt, { day: "numeric" })}
          </span>
        </span>
        {/* The title gets the full width; the status sits on its own line under it. */}
        <span className="min-w-0 flex-1 space-y-1">
          <span className={cn(label, "block text-psg-red")}>{t(`types.${event.type}`)}</span>
          <span className="block text-[15px] leading-snug font-semibold text-pretty">{event.title}</span>
          <span className="block truncate text-[13px] text-muted-foreground">
            {format.dateTime(event.startsAt, { hour: "2-digit", minute: "2-digit" })}
            {event.location ? ` · ${event.location}` : ""}
          </span>
          <span className="flex flex-wrap items-center gap-2 pt-1">
            <Status event={event} />
            {event.match ? <MatchBadge match={event.match} /> : null}
          </span>
        </span>
        <ArrowRight className="size-3.5 shrink-0 self-center text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
      </span>
    </EventListLink>
  );
}

/** Upcoming events: the next one first, then the others under month headings (« Oct. 2026 »). */
export function EventList({ events }: { events: EventView[] }) {
  const t = useTranslations("Events");
  const format = useFormatter();
  const [next, ...rest] = events;
  const months = new Map<string, EventView[]>();
  for (const event of rest) {
    const key = format.dateTime(event.startsAt, { month: "short", year: "numeric" });
    months.set(key, [...(months.get(key) ?? []), event]);
  }

  return (
    <div className="space-y-6">
      {/* Same discreet labels as "En direct" on the matches page; the page title stays for screen readers. */}
      <h1 className="sr-only">{t("title")}</h1>
      {/* (With no event at all, the layout shows EventsEmpty instead of this list.) */}
      {next ? (
        <section className="space-y-2.5">
          <h2 className={cn(label, "text-muted-foreground")}>{t("nextUp")}</h2>
          <EventRow event={next} isDefault />
        </section>
      ) : null}

      {[...months.entries()].map(([month, list]) => (
        <section key={month} className="space-y-2.5" aria-label={month}>
          <h2 className={cn(label, "text-muted-foreground")}>{month}</h2>
          <ul className="space-y-2">
            {list.map((event) => (
              <li key={event.id}>
                <EventRow event={event} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
