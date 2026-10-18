"use client";

import { useLocale } from "next-intl";
import { useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type Point = { key: string; views: number; visitors: number };

/** A round top for the scale: 0, then 1/2/5 × 10ⁿ above the highest value. */
function niceMax(value: number) {
  if (value <= 4) return 4;
  const power = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((factor) => factor * power >= value / 4)! * power;
  return Math.ceil(value / step) * step;
}

/** "2026-10-18 14:00" → "14:00", "2026-10-18" → "18 oct.", "2026-10" → "oct. 2026". */
function useLabel(bucket: "hour" | "day" | "month") {
  const locale = useLocale();
  return useMemo(() => {
    const day = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "UTC" });
    const long = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
    const month = new Intl.DateTimeFormat(locale, { month: "short", year: "numeric", timeZone: "UTC" });
    return {
      short: (key: string) => (bucket === "hour" ? key.slice(11, 16) : bucket === "day" ? day.format(new Date(`${key}T12:00:00Z`)) : month.format(new Date(`${key}-15T12:00:00Z`))),
      long: (key: string) =>
        bucket === "hour" ? `${long.format(new Date(`${key.slice(0, 10)}T12:00:00Z`))} · ${key.slice(11, 16)}` : bucket === "day" ? long.format(new Date(`${key}T12:00:00Z`)) : month.format(new Date(`${key}-15T12:00:00Z`)),
    };
  }, [bucket, locale]);
}

const W = 1000;
const H = 260;

/**
 * The big chart of the audience page: one series as a blue area (page views, API calls), the
 * other as a red line (visitors, errors). Hovering or touching shows the values of the moment.
 */
export function AreaChart({
  points,
  bucket,
  labels,
  className,
}: {
  points: Point[];
  bucket: "hour" | "day" | "month";
  labels: { views: string; visitors: string };
  className?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const label = useLabel(bucket);
  const top = niceMax(Math.max(1, ...points.map((point) => Math.max(point.views, point.visitors))));
  const x = (index: number) => (points.length < 2 ? W / 2 : (index / (points.length - 1)) * W);
  const y = (value: number) => H - (value / top) * H;
  const line = (pick: (point: Point) => number) => points.map((point, index) => `${index ? "L" : "M"}${x(index).toFixed(1)},${y(pick(point)).toFixed(1)}`).join(" ");
  const area = `${line((point) => point.views)} L${W},${H} L0,${H} Z`;
  // About six dates under the chart, evenly spread.
  const ticks = points.length <= 7 ? points.map((_, index) => index) : Array.from({ length: 6 }, (_, index) => Math.round((index * (points.length - 1)) / 5));

  function move(clientX: number) {
    const rect = box.current?.getBoundingClientRect();
    if (!rect || !points.length) return;
    setHover(Math.max(0, Math.min(points.length - 1, Math.round(((clientX - rect.left) / rect.width) * (points.length - 1)))));
  }

  const active = hover === null ? null : points[hover];
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[12px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px] bg-psg-blue dark:bg-[#4a8bd0]" />
          {labels.views}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-3 rounded-full bg-psg-red" />
          {labels.visitors}
        </span>
      </div>
      <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3">
        {/* The scale, four steps. */}
        <div className="relative h-[220px] w-8 text-right text-[11px] text-muted-foreground tabular-nums sm:h-[260px]">
          {[1, 0.75, 0.5, 0.25, 0].map((share) => (
            <span key={share} className="absolute right-0 -translate-y-1/2" style={{ top: `${(1 - share) * 100}%` }}>
              {Math.round(top * share)}
            </span>
          ))}
        </div>
        <div
          ref={box}
          className="relative h-[220px] touch-pan-y sm:h-[260px]"
          onPointerMove={(event) => move(event.clientX)}
          onPointerDown={(event) => move(event.clientX)}
          onPointerLeave={() => setHover(null)}
        >
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" aria-hidden>
            <defs>
              <linearGradient id="audience-area" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" className="[stop-color:var(--color-psg-blue)] dark:[stop-color:#4a8bd0]" stopOpacity="0.35" />
                <stop offset="1" className="[stop-color:var(--color-psg-blue)] dark:[stop-color:#4a8bd0]" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[0.25, 0.5, 0.75, 1].map((share) => (
              <line key={share} x1="0" x2={W} y1={H - share * H} y2={H - share * H} className="stroke-foreground/10" strokeDasharray="3 5" vectorEffect="non-scaling-stroke" />
            ))}
            <line x1="0" x2={W} y1={H} y2={H} className="stroke-foreground/20" vectorEffect="non-scaling-stroke" />
            <path d={area} fill="url(#audience-area)" />
            <path d={line((point) => point.views)} fill="none" className="stroke-psg-blue dark:stroke-[#4a8bd0]" strokeWidth="2.25" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            <path d={line((point) => point.visitors)} fill="none" className="stroke-psg-red" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            {hover !== null ? <line x1={x(hover)} x2={x(hover)} y1="0" y2={H} className="stroke-foreground/30" vectorEffect="non-scaling-stroke" /> : null}
          </svg>
          {active ? (
            <>
              {/* The two dots of the moment, kept round (outside the stretched drawing). */}
              <span className="pointer-events-none absolute size-2.5 -translate-1/2 rounded-full bg-psg-blue ring-2 ring-card dark:bg-[#4a8bd0]" style={{ left: `${(x(hover!) / W) * 100}%`, top: `${(y(active.views) / H) * 100}%` }} />
              <span className="pointer-events-none absolute size-2.5 -translate-1/2 rounded-full bg-psg-red ring-2 ring-card" style={{ left: `${(x(hover!) / W) * 100}%`, top: `${(y(active.visitors) / H) * 100}%` }} />
              <div
                className="pointer-events-none absolute top-2 z-10 min-w-36 rounded-[10px] border bg-popover px-3 py-2 text-[12px] shadow-brand"
                style={hover! > points.length / 2 ? { right: `${100 - (x(hover!) / W) * 100 + 2}%` } : { left: `${(x(hover!) / W) * 100 + 2}%` }}
              >
                <p className="mb-1 font-semibold capitalize">{label.long(active.key)}</p>
                <p className="flex justify-between gap-4 text-muted-foreground">
                  {labels.views}
                  <span className="font-semibold text-foreground tabular-nums">{active.views}</span>
                </p>
                <p className="flex justify-between gap-4 text-muted-foreground">
                  {labels.visitors}
                  <span className="font-semibold text-foreground tabular-nums">{active.visitors}</span>
                </p>
              </div>
            </>
          ) : null}
        </div>
        <span />
        <div className="relative mt-2 h-4 text-[11px] text-muted-foreground">
          {ticks.map((index, position) => (
            <span
              key={index}
              className={cn(
                "absolute whitespace-nowrap",
                index === 0 ? "left-0" : index === points.length - 1 ? "right-0" : "-translate-x-1/2",
                // Phones: every other date only, so they never overlap.
                position % 2 === 1 && position !== ticks.length - 1 && "max-sm:hidden",
              )}
              style={index === 0 || index === points.length - 1 ? undefined : { left: `${(x(index) / W) * 100}%` }}
            >
              {points[index] ? label.short(points[index].key) : null}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
