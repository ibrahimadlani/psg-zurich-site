"use client";

import { useSelectedLayoutSegment } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * /evenements on a computer: the list on a third, the open event on the other two (each new
 * one fades and slides in). On a phone: the list alone, and an event slides in from the right
 * over it; going back slides the list in from the left.
 */
export function EventsShell({ list, children }: { list: React.ReactNode; children: React.ReactNode }) {
  const segment = useSelectedLayoutSegment();
  const open = segment !== null;
  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-10">
      <aside
        className={cn(
          // Scrolls on its own on a computer, so the open event stays in view.
          "lg:sticky lg:top-6 lg:-mr-2 lg:max-h-[calc(100svh-3rem)] lg:overflow-y-auto lg:pr-2 lg:pb-6 lg:pl-1.5 [scrollbar-width:thin]",
          open ? "max-lg:hidden" : "max-lg:animate-in max-lg:fade-in-0 max-lg:slide-in-from-left-8 max-lg:duration-300",
        )}
      >
        {list}
      </aside>
      <section
        key={segment ?? "next"}
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
