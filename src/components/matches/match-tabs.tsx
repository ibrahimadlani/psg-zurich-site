"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type Panel = { id: string; label: React.ReactNode; content: React.ReactNode };

/** Upcoming / Results switch, plus optional extra panels (league tables); every panel is rendered on the server. */
export function MatchTabs({
  labels,
  upcoming,
  results,
  extra = [],
  extraClassName,
}: {
  labels: { upcoming: React.ReactNode; results: React.ReactNode };
  upcoming: React.ReactNode;
  results: React.ReactNode;
  extra?: Panel[];
  /** Classes of the extra panels' switch (e.g. hidden on a computer, where they sit beside). */
  extraClassName?: string;
}) {
  const panels: Panel[] = [
    { id: "upcoming", label: labels.upcoming, content: upcoming },
    { id: "results", label: labels.results, content: results },
    ...extra,
  ];
  const [tab, setTab] = useState("upcoming");
  const current = panels.find((panel) => panel.id === tab) ?? panels[0]!;
  return (
    <div className="space-y-4">
      {/* Two groups: the fixtures (upcoming, results) on the left, the league tables on the right. */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {[panels.slice(0, 2), panels.slice(2)].map((group, index) =>
          group.length ? (
            <TabList key={index} panels={group} tab={tab} onSelect={setTab} className={index ? extraClassName : undefined} />
          ) : null,
        )}
      </div>
      <div role="tabpanel" className="animate-page-in motion-reduce:animate-none" key={current.id}>
        {current.content}
      </div>
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
export function PanelTabs({ panels, className }: { panels: Panel[]; className?: string }) {
  const [tab, setTab] = useState(panels[0]?.id ?? "");
  const current = panels.find((panel) => panel.id === tab) ?? panels[0];
  if (!current) return null;
  return (
    <div className={cn("space-y-4", className)}>
      <TabList panels={panels} tab={tab} onSelect={setTab} />
      <div role="tabpanel" className="animate-page-in motion-reduce:animate-none" key={current.id}>
        {current.content}
      </div>
    </div>
  );
}
