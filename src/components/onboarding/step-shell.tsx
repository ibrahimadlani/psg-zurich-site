"use client";

import { useEffect, useRef, useState } from "react";

type Direction = "forward" | "back";
type Shown = { key: string | number; node: React.ReactNode };

/**
 * Steps of a flow, one at a time: the new step slides in from the side we are going to while
 * the old one fades out the other way, both stacked in the same grid cell (no layout jump).
 * The container's height follows the current step smoothly.
 */
export function StepShell({
  stepKey,
  direction,
  children,
}: {
  stepKey: string | number;
  direction: Direction;
  children: React.ReactNode;
}) {
  const [last, setLast] = useState<Shown>({ key: stepKey, node: children });
  const [leaving, setLeaving] = useState<Shown | null>(null);
  // Keep the outgoing step on screen while it animates out ("adjust state while rendering").
  if (stepKey !== last.key) {
    setLeaving(last);
    setLast({ key: stepKey, node: children });
  } else if (children !== last.node) {
    setLast({ key: stepKey, node: children });
  }

  const current = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | null>(null);
  useEffect(() => {
    const element = current.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setHeight(element.offsetHeight));
    observer.observe(element);
    return () => observer.disconnect();
  }, [stepKey]);

  const offsets =
    direction === "forward"
      ? ({ "--step-from": "24px", "--step-to": "-24px" } as React.CSSProperties)
      : ({ "--step-from": "-24px", "--step-to": "24px" } as React.CSSProperties);

  return (
    <div
      className="step-motion transition-[height] duration-250 ease-out motion-reduce:transition-none"
      style={{ ...offsets, height: height ?? undefined }}
    >
      <div className="grid">
        {leaving ? (
          <div
            key={leaving.key}
            aria-hidden
            inert
            className="pointer-events-none animate-step-out [grid-area:1/1]"
            onAnimationEnd={() => setLeaving(null)}
          >
            {leaving.node}
          </div>
        ) : null}
        <div key={stepKey} ref={current} className="animate-step-in self-start [grid-area:1/1]">
          {children}
        </div>
      </div>
    </div>
  );
}
