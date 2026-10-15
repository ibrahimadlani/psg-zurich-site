import { cn } from "@/lib/utils";

export type PillTone = "neutral" | "ok" | "warn" | "danger" | "brand";

const tones: Record<PillTone, string> = {
  neutral: "bg-foreground/[0.06] text-muted-foreground",
  ok: "bg-emerald-600/12 text-emerald-700 dark:text-emerald-400",
  warn: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  danger: "bg-psg-red/10 text-psg-red",
  brand: "bg-psg-blue/10 text-psg-blue dark:bg-white/10 dark:text-foreground",
};

/** One status, one small pill (same family as the event list's). */
export function StatusPill({ tone = "neutral", children, className }: { tone?: PillTone; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2.5 text-[12px] font-medium whitespace-nowrap [&_svg]:size-3",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
