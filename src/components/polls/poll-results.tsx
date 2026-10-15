import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Option = { id: string; label: string; votes: number };

/** Results as bars: share and count per option, the leading one in PSG blue, mine ticked. */
export function PollResults({ options, total, myOption, votesLabel }: { options: Option[]; total: number; myOption?: string | null; votesLabel: (count: number) => string }) {
  const top = Math.max(0, ...options.map((option) => option.votes));
  return (
    <ul className="space-y-2">
      {options.map((option) => {
        const share = total ? option.votes / total : 0;
        const leading = option.votes > 0 && option.votes === top;
        return (
          <li key={option.id} className="space-y-1">
            <div className="flex items-baseline justify-between gap-3 text-[14px]">
              <span className={cn("flex min-w-0 items-center gap-1.5", leading && "font-semibold")}>
                {myOption === option.id ? <Check className="size-3.5 shrink-0 text-psg-blue dark:text-foreground" aria-hidden /> : null}
                <span className="truncate">{option.label}</span>
              </span>
              <span className="shrink-0 text-[13px] text-muted-foreground tabular-nums">
                {Math.round(share * 100)}% · {votesLabel(option.votes)}
              </span>
            </div>
            <span className="block h-2 overflow-hidden rounded-full bg-foreground/[0.07]">
              <span
                className={cn("block h-full rounded-full transition-[width] duration-700 ease-out", leading ? "bg-psg-blue dark:bg-foreground/80" : "bg-foreground/25")}
                style={{ width: `${share * 100}%` }}
              />
            </span>
          </li>
        );
      })}
    </ul>
  );
}
