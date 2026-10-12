import { useTranslations } from "next-intl";
import type { MatchTimelineEntry } from "@/db/schema";
import { cn } from "@/lib/utils";

const icons: Record<MatchTimelineEntry["type"], string> = {
  goal: "⚽",
  own_goal: "⚽",
  penalty: "⚽",
  missed_penalty: "✕",
  yellow: "▮",
  red: "▮",
  substitution: "⇄",
  var: "VAR",
};

/** Goals and cards (substitutions only when `withSubstitutions`), PSG on the home column of the scoreboard. */
export function MatchTimeline({
  entries,
  psgFirst,
  withSubstitutions = false,
}: {
  entries: MatchTimelineEntry[];
  psgFirst: boolean;
  withSubstitutions?: boolean;
}) {
  const t = useTranslations("Matches.timeline");
  const shown = entries.filter((entry) => withSubstitutions || (entry.type !== "substitution" && entry.type !== "var"));
  if (shown.length === 0) return null;

  return (
    <ol className="space-y-1.5 text-sm">
      {shown.map((entry, index) => {
        const left = (entry.side === "psg") === psgFirst;
        const minute = `${entry.minute}${entry.extra ? `+${entry.extra}` : ""}'`;
        return (
          <li key={index} className={cn("flex items-center gap-2", left ? "justify-start" : "flex-row-reverse text-right")}>
            <span className="w-10 shrink-0 font-mono text-xs text-muted-foreground tabular-nums">{minute}</span>
            <span
              aria-hidden
              className={cn(
                "w-5 shrink-0 text-center text-xs",
                entry.type === "yellow" && "text-yellow-500",
                entry.type === "red" && "text-psg-red",
              )}
            >
              {icons[entry.type]}
            </span>
            <span className="min-w-0">
              <span className="font-medium">{entry.player ?? "—"}</span>
              <span className="text-muted-foreground">
                {entry.type === "own_goal" || entry.type === "penalty" || entry.type === "missed_penalty"
                  ? ` (${t(entry.type)})`
                  : null}
                {entry.related && (entry.type === "goal" || entry.type === "substitution")
                  ? ` · ${t(entry.type === "goal" ? "assist" : "for", { player: entry.related })}`
                  : null}
              </span>
              <span className="sr-only"> — {t(entry.type)}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
