import { adminCard, adminLabel } from "@/components/admin/ui/styles";
import { cn } from "@/lib/utils";

/** A tiny line of the values (no axes): the trend at a glance. */
function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null;
  const max = Math.max(...points, 1);
  const min = Math.min(...points);
  const span = max - min || 1;
  const step = 100 / (points.length - 1);
  const path = points.map((value, index) => `${(index * step).toFixed(2)},${(26 - ((value - min) / span) * 22).toFixed(2)}`).join(" ");
  return (
    <svg aria-hidden viewBox="0 0 100 28" preserveAspectRatio="none" className="h-7 w-full text-psg-blue dark:text-foreground/70">
      <polyline points={`0,28 ${path} 100,28`} className="fill-current opacity-10" stroke="none" />
      <polyline points={path} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

/** One figure of the dashboard: label, big number, a line of context, maybe a trend or a gauge. */
export function Kpi({
  label,
  value,
  hint,
  points,
  gauge,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  points?: number[];
  /** 0–1: a thin bar under the number (share paid…). */
  gauge?: number;
  className?: string;
}) {
  return (
    <div className={cn(adminCard, "flex flex-col gap-2 p-4 lg:p-5", className)}>
      <p className={adminLabel}>{label}</p>
      <p className="font-narrow text-[44px] leading-[0.85] font-extrabold tabular-nums italic">{value}</p>
      {gauge !== undefined ? (
        <span className="block h-1.5 overflow-hidden rounded-full bg-foreground/[0.07]">
          <span className="block h-full rounded-full bg-psg-blue dark:bg-foreground/80" style={{ width: `${Math.round(Math.min(1, Math.max(0, gauge)) * 100)}%` }} />
        </span>
      ) : null}
      {points ? <Sparkline points={points} /> : null}
      {hint ? <p className="mt-auto text-[13px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
