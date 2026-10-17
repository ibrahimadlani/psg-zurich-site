"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * A figure that rolls when it changes (up from below when it grows, down when it shrinks), like
 * the prediction scores. Reduced motion: it just changes.
 */
export function RollingNumber({ value, children, className }: { value: number; children: React.ReactNode; className?: string }) {
  // The direction is worked out when the value changes (derived state, set during render).
  const [last, setLast] = useState({ value, direction: "up" as "up" | "down" });
  if (last.value !== value) setLast({ value, direction: value >= last.value ? "up" : "down" });
  const direction = last.value !== value ? (value >= last.value ? "up" : "down") : last.direction;
  return (
    <span className={cn("inline-flex overflow-hidden", className)}>
      <span key={value} className={cn("inline-block motion-reduce:animate-none", direction === "up" ? "animate-score-up" : "animate-score-down")}>
        {children}
      </span>
    </span>
  );
}
