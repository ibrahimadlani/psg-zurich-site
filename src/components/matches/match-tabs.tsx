"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/** Upcoming / Results switch; both lists are rendered on the server. */
export function MatchTabs({
  labels,
  upcoming,
  results,
}: {
  labels: { upcoming: string; results: string };
  upcoming: React.ReactNode;
  results: React.ReactNode;
}) {
  const [tab, setTab] = useState<"upcoming" | "results">("upcoming");
  return (
    <div className="space-y-4">
      <div role="tablist" className="inline-flex rounded-[9px] border bg-card/60 p-1">
        {(["upcoming", "results"] as const).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn(
              "cursor-pointer rounded-[6px] px-3 py-1.5 font-wide text-[10px] font-semibold tracking-[0.06em] uppercase transition-colors",
              tab === key ? "bg-segment text-segment-foreground shadow-brand" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {labels[key]}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="animate-page-in motion-reduce:animate-none" key={tab}>
        {tab === "upcoming" ? upcoming : results}
      </div>
    </div>
  );
}
