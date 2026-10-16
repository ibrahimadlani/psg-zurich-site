"use client";

import { useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/** A textarea that grows with its text, from `minRows` up to `maxRows` (then it scrolls). */
export function AutoTextarea({
  minRows = 3,
  maxRows = 12,
  className,
  value,
  ...props
}: React.ComponentProps<"textarea"> & { minRows?: number; maxRows?: number; value: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const style = getComputedStyle(element);
    const line = parseFloat(style.lineHeight) || 24;
    const padding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
    element.style.height = "auto";
    const border = element.offsetHeight - element.clientHeight;
    // scrollHeight counts the padding; box-sizing border-box adds the border.
    const content = Math.min(Math.max(element.scrollHeight, minRows * line + padding), maxRows * line + padding);
    element.style.height = `${content + border}px`;
  }, [value, minRows, maxRows]);
  return <textarea ref={ref} value={value} rows={minRows} className={cn("resize-none", className)} {...props} />;
}
