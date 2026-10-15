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
}: {
  labels: { upcoming: React.ReactNode; results: React.ReactNode };
  upcoming: React.ReactNode;
  results: React.ReactNode;
  extra?: Panel[];
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
            <div key={index} role="tablist" className="inline-flex max-w-full overflow-x-auto rounded-[9px] border bg-card/60 p-1 [scrollbar-width:none]">
              {group.map((panel) => (
                <button
                  key={panel.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === panel.id}
                  onClick={() => setTab(panel.id)}
                  className={cn(
                    "inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-[6px] px-2.5 py-1.5 font-wide text-[10px] font-semibold tracking-[0.06em] whitespace-nowrap uppercase transition-colors max-[400px]:px-2",
                    tab === panel.id ? "bg-segment text-segment-foreground shadow-brand" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {panel.label}
                </button>
              ))}
            </div>
          ) : null,
        )}
      </div>
      <div role="tabpanel" className="animate-page-in motion-reduce:animate-none" key={current.id}>
        {current.content}
      </div>
    </div>
  );
}
