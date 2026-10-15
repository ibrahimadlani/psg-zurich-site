import { ArrowRight, MapPin } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { EventListLink } from "@/components/events/event-list-link";
import { MatchBadge } from "@/components/events/match-badge";
import { HumanDate } from "@/components/human-date";
import { PsgBanner } from "@/components/psg-banner";
import type { EventView } from "@/lib/events";
import { cn } from "@/lib/utils";

const label = "font-wide text-[10px] font-semibold tracking-[0.08em] uppercase";

/** Places left, full, or the member's own sign-up — the one line that matters at a glance. */
function Status({ event, inverted = false }: { event: EventView; inverted?: boolean }) {
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
        inverted
          ? tone === "ok"
            ? "bg-white text-psg-blue"
            : "bg-white/15 text-white"
          : tone === "ok"
            ? "bg-emerald-600/12 text-emerald-700 dark:text-emerald-400"
            : tone === "full"
              ? "bg-psg-red/10 text-psg-red"
              : "bg-foreground/[0.06] text-muted-foreground",
      )}
    >
      {text}
    </span>
  );
}

/** The very next event: a large card in the club's blue. */
function NextEvent({ event }: { event: EventView }) {
  return (
    <EventListLink
      id={event.id}
      isDefault
      className="overflow-hidden rounded-[14px] bg-psg-blue p-5 text-white shadow-brand transition-transform duration-200 active:scale-[0.99] data-[selected]:ring-2 data-[selected]:ring-psg-red lg:data-[default]:ring-2 lg:data-[default]:ring-psg-red"
    >
      {/* The shirt's red and white bands at the edge, as on the member card. */}
      <span aria-hidden className="absolute inset-y-0 right-7 w-4 bg-psg-red/90" />
      <span aria-hidden className="absolute inset-y-0 right-3 w-4 bg-white/90" />
      <span className="relative flex flex-col gap-3 pr-10">
        <span className={cn(label, "text-white/70")}>
          {/* The time joins the date here, now that the full schedule line is gone. */}
          <HumanDate date={event.startsAt} absolute={{ weekday: "long", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }} />
        </span>
        <span className="font-narrow text-[length:clamp(26px,6vw,32px)] leading-[0.95] font-extrabold text-balance uppercase italic">
          {event.title}
        </span>
        <span className="space-y-1 text-[14px] text-white/80">
          {event.location ? (
            <span className="flex items-start gap-1.5">
              <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              {event.location}
            </span>
          ) : null}
        </span>
        <span className="flex items-center justify-between gap-3 pt-1">
          <span className="flex min-w-0 flex-wrap items-center gap-2">
            <Status event={event} inverted />
            {event.match ? <MatchBadge match={event.match} inverted /> : null}
          </span>
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
        </span>
      </span>
    </EventListLink>
  );
}

/** A later event: date block, title, time and place, status. */
function EventRow({ event }: { event: EventView }) {
  const t = useTranslations("Events");
  const format = useFormatter();
  return (
    <EventListLink
      id={event.id}
      className="rounded-[12px] border bg-card/70 p-3.5 transition-[border-color,background-color,transform] duration-200 hover:border-foreground/30 active:scale-[0.99] data-[selected]:border-foreground/40 data-[selected]:bg-card"
    >
      {/* Open event: the PSG banner in the left margin, as in the menu. */}
      <PsgBanner className="absolute top-1/2 -left-[5px] h-7 w-2.5 -translate-y-1/2 scale-y-0 transition-transform duration-300 ease-out group-data-[selected]:scale-y-100" />
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
      {next ? (
        <section className="space-y-2.5">
          <h2 className={cn(label, "text-muted-foreground")}>{t("nextUp")}</h2>
          <NextEvent event={next} />
        </section>
      ) : (
        <p className="rounded-[10px] border border-dashed p-8 text-center text-sm text-muted-foreground">{t("empty")}</p>
      )}

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
