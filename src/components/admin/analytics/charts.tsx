import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/*
 * The small charts of the audience page: ranked bars, a split bar, a funnel, the change
 * against the period before. Plain HTML/SVG in the club's colours, light and dark alike.
 */

export type BarItem = { key: string; label: React.ReactNode; value: number; sub?: React.ReactNode; href?: string; aside?: React.ReactNode; selected?: boolean };

/** Ranked rows, each with its share drawn behind it. */
export function BarList({ items, empty, valueLabel }: { items: BarItem[]; empty: string; valueLabel?: string }) {
  if (!items.length) return <p className="rounded-[12px] border border-dashed px-4 py-8 text-center text-[13px] text-muted-foreground">{empty}</p>;
  const top = Math.max(...items.map((item) => item.value), 1);
  return (
    <div className="flex flex-col gap-1">
      {valueLabel ? <p className="flex justify-end px-2 text-[11px] text-muted-foreground">{valueLabel}</p> : null}
      <ul className="flex flex-col gap-1">
        {items.map((item) => {
          const body = (
            <>
              <span
                aria-hidden
                className={cn("absolute inset-y-0 left-0 rounded-[8px] transition-[width] duration-500", item.selected ? "bg-psg-blue/20 dark:bg-white/20" : "bg-psg-blue/[0.09] dark:bg-white/[0.08]")}
                style={{ width: `${Math.max(2, (item.value / top) * 100)}%` }}
              />
              <span className="relative min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-medium">{item.label}</span>
                {item.sub ? <span className="block truncate text-[11.5px] text-muted-foreground">{item.sub}</span> : null}
              </span>
              {item.aside ? <span className="relative shrink-0 text-[12px] text-muted-foreground tabular-nums">{item.aside}</span> : null}
              <span className="relative w-12 shrink-0 text-right text-[13.5px] font-semibold tabular-nums">{item.value.toLocaleString("fr-CH")}</span>
            </>
          );
          const row = "relative flex min-h-10 items-center gap-3 overflow-hidden rounded-[8px] px-2.5 py-1.5";
          return (
            <li key={item.key}>
              {item.href ? (
                <Link href={item.href} scroll={false} aria-current={item.selected ? "true" : undefined} className={cn(row, "transition-colors hover:bg-foreground/[0.04]")}>
                  {body}
                </Link>
              ) : (
                <div className={row}>{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const SPLIT_COLOURS = ["bg-psg-blue dark:bg-[#4a8bd0]", "bg-psg-red", "bg-foreground/35", "bg-ok", "bg-amber-500", "bg-foreground/15"];

/** Shares of a whole as one bar, with its legend (devices, languages, visitors / members). */
export function SplitBar({ parts, empty }: { parts: { key: string; label: string; value: number }[]; empty: string }) {
  const total = parts.reduce((sum, part) => sum + part.value, 0);
  if (!total) return <p className="rounded-[12px] border border-dashed px-4 py-6 text-center text-[13px] text-muted-foreground">{empty}</p>;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-3 overflow-hidden rounded-full bg-foreground/[0.06]">
        {parts.map((part, index) =>
          part.value ? <span key={part.key} className={cn("h-full first:rounded-l-full last:rounded-r-full", SPLIT_COLOURS[index % SPLIT_COLOURS.length])} style={{ width: `${(part.value / total) * 100}%` }} /> : null,
        )}
      </div>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {parts.map((part, index) => (
          <li key={part.key} className="flex items-center gap-2 text-[13px]">
            <span className={cn("size-2.5 shrink-0 rounded-[3px]", SPLIT_COLOURS[index % SPLIT_COLOURS.length])} />
            <span className="min-w-0 flex-1 truncate">{part.label}</span>
            <span className="font-semibold tabular-nums">{Math.round((part.value / total) * 100)} %</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Steps that narrow (clicks → page views → registrations), with the share kept at each step. */
export function Funnel({ steps }: { steps: { key: string; label: string; value: number }[] }) {
  const top = Math.max(steps[0]?.value ?? 0, 1);
  return (
    <ol className="flex flex-col gap-2.5">
      {steps.map((step, index) => {
        const previous = index ? steps[index - 1]!.value : null;
        return (
          <li key={step.key} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-3 text-[13px]">
              <span className="font-medium">{step.label}</span>
              <span className="flex items-baseline gap-2">
                {previous ? <span className="text-[12px] text-muted-foreground tabular-nums">{Math.round((step.value / previous) * 100)} %</span> : null}
                <span className="font-narrow text-[22px] leading-none font-extrabold tabular-nums italic">{step.value}</span>
              </span>
            </div>
            <span className="block h-2.5 overflow-hidden rounded-full bg-foreground/[0.06]">
              <span
                className={cn("block h-full rounded-full", index === steps.length - 1 ? "bg-psg-red" : "bg-psg-blue dark:bg-[#4a8bd0]")}
                style={{ width: `${Math.max(step.value ? 2 : 0, (step.value / top) * 100)}%` }}
              />
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** The change against the period before: "+12 %" in green, "−8 %" in red ("new" when nothing before). */
export function Delta({ current, previous, inverse = false, labels }: { current: number; previous: number; inverse?: boolean; labels: { new: string; same: string } }) {
  if (!previous && !current) return <span className="inline-flex items-center gap-1 text-muted-foreground"><Minus className="size-3" aria-hidden />{labels.same}</span>;
  if (!previous) return <span className="font-semibold text-ok">{labels.new}</span>;
  const change = (current - previous) / previous;
  if (Math.abs(change) < 0.005) return <span className="inline-flex items-center gap-1 text-muted-foreground"><Minus className="size-3" aria-hidden />{labels.same}</span>;
  const good = inverse ? change < 0 : change > 0;
  const Icon = change > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn("inline-flex items-center gap-0.5 font-semibold tabular-nums", good ? "text-ok" : "text-psg-red")}>
      <Icon className="size-3.5" aria-hidden />
      {change > 0 ? "+" : "−"}
      {Math.round(Math.abs(change) * 100)} %
    </span>
  );
}
