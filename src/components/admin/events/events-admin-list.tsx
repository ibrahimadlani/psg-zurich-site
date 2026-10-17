"use client";

import { Search } from "lucide-react";
import { useSelectedLayoutSegment } from "next/navigation";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { useDeferredValue, useMemo, useState } from "react";
import { adminInput } from "@/components/admin/ui/styles";
import { PsgBanner } from "@/components/psg-banner";
import { Link } from "@/i18n/navigation";
import type { AdminEventRow } from "@/lib/admin/events-query";
import { cn } from "@/lib/utils";

const fold = (text: string) => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
const label = "font-wide text-[10px] font-semibold tracking-[0.08em] uppercase";

const chip = (on: boolean) =>
  cn(
    "inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-[13px] whitespace-nowrap transition-colors lg:h-8",
    on ? "border-foreground bg-foreground text-background" : "bg-card text-muted-foreground hover:text-foreground",
  );

/** How full: a thin bar, red when full, and the figures. */
function Fill({ row }: { row: AdminEventRow }) {
  const t = useTranslations("AdminEvents");
  const share = row.capacity ? Math.min(1, row.registered / row.capacity) : null;
  return (
    <span className="flex items-center gap-2.5 pt-1">
      {share !== null ? (
        <span className="h-1.5 w-20 overflow-hidden rounded-full bg-foreground/[0.08]">
          <span className={cn("block h-full rounded-full", share >= 1 ? "bg-psg-red" : "bg-psg-blue dark:bg-foreground/70")} style={{ width: `${share * 100}%` }} />
        </span>
      ) : null}
      <span className="text-[12px] text-muted-foreground tabular-nums">
        {t("fill", { registered: row.registered, capacity: row.capacity ?? "∞" })}
        {row.waitlisted ? ` · ${t("waiting", { count: row.waitlisted })}` : ""}
        {row.present ? ` · ${t("presentCount", { count: row.present })}` : ""}
      </span>
    </span>
  );
}

function EventRowLink({ row }: { row: AdminEventRow }) {
  const tEvents = useTranslations("Events");
  const format = useFormatter();
  const segment = useSelectedLayoutSegment();
  const selected = segment === row.id;
  return (
    <Link
      href={`/admin/events/${row.id}`}
      prefetch={false}
      aria-current={selected ? "page" : undefined}
      className="group relative flex items-center gap-3.5 rounded-[12px] border bg-card/70 p-3.5 transition-[border-color,background-color,transform] hover:border-foreground/30 active:scale-[0.99] aria-[current=page]:border-foreground/40 aria-[current=page]:bg-card"
    >
      <PsgBanner className="absolute top-1/2 -left-[5px] h-7 w-2.5 -translate-y-1/2 scale-y-0 transition-transform duration-300 ease-out group-aria-[current=page]:scale-y-100" />
      <span className="flex w-11 shrink-0 flex-col items-center leading-none">
        <span className={cn(label, "text-muted-foreground")}>{format.dateTime(row.startsAt, { weekday: "short" })}</span>
        <span className="font-narrow text-[30px] leading-none font-extrabold tabular-nums italic">{format.dateTime(row.startsAt, { day: "numeric" })}</span>
        <span className="text-[10px] text-muted-foreground uppercase">{format.dateTime(row.startsAt, { month: "short" })}</span>
      </span>
      <span className="min-w-0 flex-1 space-y-0.5">
        <span className={cn(label, "block text-psg-red")}>{tEvents(`types.${row.type}`)}</span>
        <span className="block text-[15px] leading-snug font-semibold text-pretty">{row.title}</span>
        <span className="block truncate text-[13px] text-muted-foreground">
          {format.dateTime(row.startsAt, { hour: "2-digit", minute: "2-digit" })}
          {row.location ? ` · ${row.location}` : ""}
        </span>
        <Fill row={row} />
      </span>
    </Link>
  );
}

/** Left column of /admin/events: what is coming (soonest first) or what happened (latest first). */
export function EventsAdminList({ rows }: { rows: AdminEventRow[] }) {
  const t = useTranslations("AdminEvents");
  const now = useNow({ updateInterval: 60_000 });
  const [view, setView] = useState<"upcoming" | "past">("upcoming");
  const [query, setQuery] = useState("");
  const search = useDeferredValue(query);

  // An event counts as upcoming until it ends (or 3 hours after it starts).
  const isPast = (row: AdminEventRow) => (row.endsAt ?? new Date(row.startsAt.getTime() + 3 * 60 * 60 * 1000)) < now;
  const upcoming = rows.filter((row) => !isPast(row));
  const past = rows.filter(isPast).reverse();
  const shown = useMemo(() => {
    const words = fold(search).split(/\s+/).filter(Boolean);
    return (view === "upcoming" ? upcoming : past).filter((row) => words.every((word) => fold(`${row.title} ${row.location ?? ""} ${row.match ?? ""}`).includes(word)));
  }, [view, upcoming, past, search]);

  return (
    <div className="space-y-3">
      <div role="tablist" aria-label={t("viewsLabel")} className="flex gap-1.5">
        {(["upcoming", "past"] as const).map((value) => (
          <button key={value} type="button" role="tab" aria-selected={view === value} onClick={() => setView(value)} className={chip(view === value)}>
            {t(`views.${value}`)}
            <span className="tabular-nums opacity-60">{(value === "upcoming" ? upcoming : past).length}</span>
          </button>
        ))}
      </div>
      <label className="relative block">
        <span className="sr-only">{t("search")}</span>
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("search")} className={cn(adminInput, "pl-9")} />
      </label>
      {shown.length ? (
        <ul className="space-y-2">
          {shown.map((row) => (
            <li key={row.id}>
              <EventRowLink row={row} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-[12px] border border-dashed p-6 text-center text-sm text-muted-foreground">{t(search ? "noMatchSearch" : view === "upcoming" ? "emptyUpcoming" : "emptyPast")}</p>
      )}
    </div>
  );
}
