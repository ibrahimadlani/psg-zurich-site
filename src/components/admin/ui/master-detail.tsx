"use client";

import { useSelectedLayoutSegment } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * A list and the item opened from it (members, events…). Computer: the list on the left
 * (scrolling on its own), the item on the right. Phone: the list alone; an item slides in from
 * the right over it, and going back slides the list in again. Used by a section's layout, the
 * item being its [id] page.
 */
export function MasterDetail({ list, children }: { list: React.ReactNode; children: React.ReactNode }) {
  const segment = useSelectedLayoutSegment();
  const open = segment !== null;
  return (
    // minmax(0,1fr) on phones: the column keeps the screen's width (the filter chips scroll inside
    // it instead of widening the page).
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(18rem,2fr)_1px_minmax(0,3fr)] lg:gap-x-6">
      <aside
        className={cn(
          "min-w-0 lg:sticky lg:top-6 lg:-mr-2 lg:max-h-[calc(100svh-3rem)] lg:overflow-y-auto lg:pr-2 lg:pb-4 lg:pl-1.5 [scrollbar-width:thin]",
          open ? "max-lg:hidden" : "max-lg:animate-in max-lg:fade-in-0 max-lg:slide-in-from-left-8 max-lg:duration-300",
        )}
      >
        {list}
      </aside>
      <div aria-hidden className="hidden w-px self-stretch bg-border lg:block" />
      <section
        key={segment ?? "index"}
        className={cn(
          "min-w-0 animate-in fade-in-0 duration-300 ease-out motion-reduce:slide-in-from-right-0",
          open ? "slide-in-from-right-12 lg:slide-in-from-right-4" : "max-lg:hidden lg:slide-in-from-right-4",
        )}
      >
        {children}
      </section>
    </div>
  );
}
