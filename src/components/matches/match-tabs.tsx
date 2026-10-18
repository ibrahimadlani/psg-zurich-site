"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export type Panel = { id: string; label: React.ReactNode; content: React.ReactNode; title?: string };

/** Same discreet heading as the one above the big scoreboard ("Live", "Next match"). */
export const panelTitle = "font-wide text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase";

function PanelBody({ panel }: { panel: Panel }) {
  return (
    <div role="tabpanel" className="animate-page-in space-y-2.5 motion-reduce:animate-none">
      {panel.title ? <h2 className={panelTitle}>{panel.title}</h2> : null}
      {panel.content}
    </div>
  );
}

/** A competition the fixtures can be narrowed to, with its own pre-rendered lists. */
export type FixtureFilter = { id: string; label: React.ReactNode; upcoming: React.ReactNode; results: React.ReactNode };

/** Same quiet link as "Expand" beside the table and the links above the scoreboard. */
export const quietAction = "inline-flex cursor-pointer items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground";

/**
 * Upcoming / Results switch, plus optional extra panels (league tables) and competition filters
 * (a second click on the active one shows everything again); every list is rendered on the server.
 */
export function MatchTabs({
  labels,
  upcoming,
  results,
  extra = [],
  extraClassName,
  titles,
  filters = [],
}: {
  labels: { upcoming: React.ReactNode; results: React.ReactNode };
  titles?: { upcoming: string; results: string };
  upcoming: React.ReactNode;
  results: React.ReactNode;
  extra?: Panel[];
  /** Classes of the extra panels' switch (e.g. hidden on a computer, where they sit beside). */
  extraClassName?: string;
  filters?: FixtureFilter[];
}) {
  const [tab, setTab] = useState("upcoming");
  const [filter, setFilter] = useState<string | null>(null);
  const narrowed = filters.find((item) => item.id === filter);
  const panels: Panel[] = [
    { id: "upcoming", label: labels.upcoming, content: narrowed ? narrowed.upcoming : upcoming, title: titles?.upcoming },
    { id: "results", label: labels.results, content: narrowed ? narrowed.results : results, title: titles?.results },
    ...extra,
  ];
  const current = panels.find((panel) => panel.id === tab) ?? panels[0]!;
  const fixturesShown = tab === "upcoming" || tab === "results";
  return (
    <div className="space-y-4">
      {/* The fixtures (upcoming, results) on the left; the competition filters, then the league tables, on the right. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <TabList panels={panels.slice(0, 2)} tab={tab} onSelect={setTab} />
        {filters.length && fixturesShown ? (
          // Computer only: on a phone the league tables' tabs sit on this row with the same names.
          <div className="ml-auto flex items-center gap-4 max-lg:hidden">
            {filters.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={filter === item.id}
                onClick={() => setFilter((value) => (value === item.id ? null : item.id))}
                className={cn(quietAction, "underline-offset-[6px] aria-pressed:font-medium aria-pressed:text-foreground aria-pressed:underline aria-pressed:decoration-psg-red aria-pressed:decoration-2")}
              >
                {item.label}
              </button>
            ))}
          </div>
        ) : null}
        {extra.length ? <TabList panels={panels.slice(2)} tab={tab} onSelect={setTab} className={cn("ml-auto", extraClassName)} /> : null}
      </div>
      <PanelBody key={`${current.id}-${fixturesShown ? (filter ?? "all") : ""}`} panel={current} />
    </div>
  );
}

function TabList({ panels, tab, onSelect, className }: { panels: Panel[]; tab: string; onSelect: (id: string) => void; className?: string }) {
  return (
    <div role="tablist" className={cn("inline-flex max-w-full overflow-x-auto rounded-[9px] border bg-card/60 p-1 [scrollbar-width:none]", className)}>
      {panels.map((panel) => (
        <button
          key={panel.id}
          type="button"
          role="tab"
          aria-selected={tab === panel.id}
          onClick={() => onSelect(panel.id)}
          className={cn(
            "inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-[6px] px-2.5 py-1.5 font-wide text-[10px] font-semibold tracking-[0.06em] whitespace-nowrap uppercase transition-colors max-[400px]:px-2",
            tab === panel.id ? "bg-segment text-segment-foreground shadow-brand" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {panel.label}
        </button>
      ))}
    </div>
  );
}

/** Just a switch between panels (the league tables beside the fixtures, on a computer). */
export function PanelTabs({ panels, className, action }: { panels: Panel[]; className?: string; action?: React.ReactNode }) {
  const [tab, setTab] = useState(panels[0]?.id ?? "");
  const current = panels.find((panel) => panel.id === tab) ?? panels[0];
  if (!current) return null;
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between gap-2">
        <TabList panels={panels} tab={tab} onSelect={setTab} />
        {action}
      </div>
      <PanelBody key={current.id} panel={current} />
    </div>
  );
}
