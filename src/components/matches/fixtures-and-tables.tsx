"use client";

import { Maximize2, Minimize2 } from "lucide-react";
import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { PanelTabs, quietAction, type Panel } from "@/components/matches/match-tabs";
import { cn } from "@/lib/utils";

const icon = "absolute size-3.5 transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.34,1.4,0.64,1)] motion-reduce:transition-none";

/**
 * Computer: the fixtures on the left, the league tables in a column on the right. The button
 * beside the table switches open the full-width table (wins, draws, losses, form), above the
 * fixtures, and back. Phones never see the column: their tables are tabs of the fixtures.
 */
export function FixturesAndTables({
  fixtures,
  compact,
  full,
  labels,
}: {
  fixtures: React.ReactNode;
  compact: Panel[];
  full: Panel[];
  labels: { aside: string; expand: string; collapse: string };
}) {
  const [wide, setWide] = useState(false);
  const aside = useRef<HTMLElement>(null);

  function toggle() {
    const update = () => setWide((value) => !value);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Then back up, smoothly, to the top of the table (its new place: above the fixtures, or
    // beside them) — only when it is now above the screen, never down.
    const scrollUp = () => {
      const element = aside.current;
      if (element && element.getBoundingClientRect().top < 0) element.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    };
    const doc = document as Document & { startViewTransition?: (callback: () => void) => { finished: Promise<void> } };
    if (!doc.startViewTransition || reduced) {
      flushSync(update);
      return scrollUp();
    }
    void doc.startViewTransition(() => flushSync(update)).finished.then(scrollUp);
  }

  return (
    <div className={cn("grid items-start gap-8", !wide && "lg:grid-cols-[minmax(0,1fr)_24rem]")}>
      {/* Named for the view transition (globals.css): each block glides to its new place. */}
      <div className="min-w-0 [view-transition-name:fixtures]">{fixtures}</div>
      <aside
        ref={aside}
        aria-label={labels.aside}
        data-wide={wide || undefined}
        className={cn("standings-aside hidden scroll-mt-6 [view-transition-name:standings] lg:block", wide ? "lg:order-first" : "lg:sticky lg:top-6")}
      >
        <PanelTabs
          panels={wide ? full : compact}
          action={
            <button
              type="button"
              onClick={toggle}
              aria-expanded={wide}
              title={wide ? labels.collapse : labels.expand}
              className={quietAction}
            >
              {/* Turned 45°: the arrows point left and right, the table widens. The two icons swap with a turn. */}
              <span aria-hidden className="relative grid size-3.5 place-items-center">
                <Maximize2 className={cn(icon, wide ? "scale-50 rotate-[135deg] opacity-0" : "rotate-45")} />
                <Minimize2 className={cn(icon, wide ? "rotate-45" : "scale-50 -rotate-45 opacity-0")} />
              </span>
              {wide ? labels.collapse : labels.expand}
            </button>
          }
        />
      </aside>
    </div>
  );
}
