"use client";

import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Questions that open and close smoothly (the answer's row grows from 0fr to 1fr), one at a
 * time. Answers stay in the page for search engines and the browser's find.
 */
export function FaqAccordion({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const id = useId();
  return (
    <div className="divide-y overflow-hidden rounded-[14px] border bg-card">
      {items.map((item, index) => {
        const expanded = open === index;
        return (
          <div key={item.q}>
            <h3>
              <button
                type="button"
                id={`${id}-q${index}`}
                aria-expanded={expanded}
                aria-controls={`${id}-a${index}`}
                onClick={() => setOpen(expanded ? null : index)}
                className="flex min-h-14 w-full cursor-pointer items-center gap-3 px-4 py-3 text-left text-[15px] font-semibold transition-colors hover:bg-foreground/[0.02]"
              >
                <span className="min-w-0 flex-1 text-pretty">{item.q}</span>
                <ChevronDown
                  aria-hidden
                  className={cn("size-4 shrink-0 text-muted-foreground transition-transform duration-300 ease-out motion-reduce:transition-none", expanded && "rotate-180")}
                />
              </button>
            </h3>
            <div
              id={`${id}-a${index}`}
              role="region"
              aria-labelledby={`${id}-q${index}`}
              className={cn(
                "grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none",
                expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="overflow-hidden" inert={!expanded}>
                <p className="px-4 pb-4 text-[15px] leading-relaxed text-pretty text-muted-foreground">{item.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
