"use client";

import { ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type Step = { key: string; title: string; body: string; href: string; cta: string; art: React.ReactNode };

/**
 * "A season with us", told as you scroll. On a computer the picture stays pinned on the left
 * and changes (cross-fade) with the step being read on the right; on a phone each step is a
 * card with its own picture.
 */
export function SeasonStory({ steps }: { steps: Step[] }) {
  const [active, setActive] = useState(0);
  const items = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    // The step crossing the middle of the screen is the one being read.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.index));
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    for (const item of items.current) if (item) observer.observe(item);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-14">
      {/* Computer: the pinned picture */}
      <div className="hidden lg:block">
        <div className="sticky top-[calc(50vh-11rem)] aspect-[8/5] overflow-hidden rounded-[22px] shadow-brand ring-1 ring-foreground/10">
          {steps.map((step, index) => (
            <div
              key={step.key}
              aria-hidden={index !== active}
              className={cn(
                "absolute inset-0 transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none",
                index === active ? "scale-100 opacity-100" : "scale-[1.04] opacity-0",
              )}
            >
              {step.art}
            </div>
          ))}
          {/* Progress: one bar per step */}
          <div className="absolute inset-x-5 bottom-5 flex gap-1.5">
            {steps.map((step, index) => (
              <span key={step.key} className="h-1 flex-1 overflow-hidden rounded-full bg-white/25">
                <span className={cn("block h-full rounded-full bg-white transition-[width] duration-500 motion-reduce:transition-none", index <= active ? "w-full" : "w-0")} />
              </span>
            ))}
          </div>
        </div>
      </div>

      <ol className="flex flex-col gap-4 lg:gap-0">
        {steps.map((step, index) => (
          <li
            key={step.key}
            ref={(element) => {
              items.current[index] = element;
            }}
            data-index={index}
            className="lg:flex lg:min-h-[52vh] lg:items-center"
          >
            <div
              className={cn(
                "overflow-hidden rounded-[18px] border bg-card shadow-brand transition-opacity duration-500 lg:border-0 lg:bg-transparent lg:shadow-none motion-reduce:transition-none",
                index === active ? "lg:opacity-100" : "lg:opacity-35",
              )}
            >
              <div className="aspect-[8/5] lg:hidden">{step.art}</div>
              <div className="flex flex-col gap-3 p-5 lg:p-0">
                <span className="font-narrow text-[15px] font-extrabold tracking-[0.04em] text-psg-red italic">{String(index + 1).padStart(2, "0")}</span>
                <h3 className="font-narrow text-[length:clamp(30px,4.4vw,48px)] leading-[0.92] font-extrabold uppercase italic">{step.title}</h3>
                <p className="max-w-[30rem] text-[16px] leading-relaxed text-pretty text-muted-foreground">{step.body}</p>
                <Link href={step.href} className="inline-flex items-center gap-1.5 self-start border-b border-psg-red pb-0.5 text-[14px] font-semibold">
                  {step.cta}
                  <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
