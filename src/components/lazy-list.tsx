"use client";

import { useEffect, useRef, useState } from "react";
import { MatchRowSkeleton } from "@/components/skeletons";

/**
 * Long lists shown a page at a time: the first `initial` items, then `step` more each time the
 * end of the list comes within ~400 px of the screen (placeholder rows hold the spot).
 */
export function LazyList({
  items,
  initial = 10,
  step = 10,
  className,
  placeholder,
}: {
  items: React.ReactNode[];
  initial?: number;
  step?: number;
  className?: string;
  /** What stands in for the next rows (match rows by default). */
  placeholder?: React.ReactNode;
}) {
  const [shown, setShown] = useState(initial);
  const sentinel = useRef<HTMLDivElement>(null);
  const more = shown < items.length;

  useEffect(() => {
    const element = sentinel.current;
    if (!element || !more) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setShown((count) => count + step);
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [more, step, shown]);

  return (
    <div className={className}>
      {items.slice(0, shown).map((item, index) => (
        // Rows added by scrolling fade in; the first page is already there.
        <div key={index} className={index >= initial ? "animate-page-in" : undefined}>
          {item}
        </div>
      ))}
      {more ? (
        <div ref={sentinel} aria-hidden className="space-y-2.5">
          {placeholder ?? (
            <>
              <MatchRowSkeleton />
              <MatchRowSkeleton />
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
