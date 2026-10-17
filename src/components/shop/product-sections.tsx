"use client";

import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";
import { cn } from "@/lib/utils";

type Section = { title: string; text?: string; bullets?: string[] };

/**
 * The product's details as open sections (Description, Details, Shipping), each folding on its
 * own, separated by hairlines — no cards, nothing in the way of the words.
 */
export function ProductSections({ sections }: { sections: Section[] }) {
  const id = useId();
  const [closed, setClosed] = useState<Set<number>>(new Set());
  return (
    <div className="flex flex-col">
      {sections.map((section, index) => {
        const open = !closed.has(index);
        return (
          <section key={section.title} className="border-b first:border-t">
            <h2>
              <button
                type="button"
                aria-expanded={open}
                aria-controls={`${id}-${index}`}
                onClick={() =>
                  setClosed((current) => {
                    const next = new Set(current);
                    if (next.has(index)) next.delete(index);
                    else next.add(index);
                    return next;
                  })
                }
                className="flex w-full cursor-pointer items-center justify-between gap-3 py-4 text-left text-[16px] font-semibold"
              >
                {section.title}
                <ChevronDown className={cn("size-[18px] shrink-0 transition-transform duration-300", open && "rotate-180")} aria-hidden />
              </button>
            </h2>
            <div
              id={`${id}-${index}`}
              data-open={open || undefined}
              className="grid grid-rows-[0fr] opacity-0 transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] data-[open]:grid-rows-[1fr] data-[open]:opacity-100 motion-reduce:transition-none"
            >
              <div className="min-h-0 overflow-hidden" inert={!open}>
                <div className="pb-5 text-[15px] leading-relaxed text-pretty">
                  {section.text ? <p className="whitespace-pre-line">{section.text}</p> : null}
                  {section.bullets?.length ? (
                    <ul className="flex list-disc flex-col gap-1 pl-5 marker:text-foreground/40">
                      {section.bullets.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
