import { useTranslations } from "next-intl";
import { TeamCrest } from "@/components/matches/team-crest";
import { PsgBanner } from "@/components/psg-banner";
import { PSG_TEAM_ID } from "@/lib/football/api";
import type { StandingRow } from "@/lib/football/standings";
import { cn } from "@/lib/utils";

const formDot = { W: "bg-emerald-500", D: "bg-foreground/30", L: "bg-psg-red" } as const;

/** Ligue 1 table, PSG highlighted; wins/draws/losses and form hidden on phones. */
export function StandingsTable({ rows }: { rows: StandingRow[] | null }) {
  const t = useTranslations("Matches.standings");
  if (!rows?.length) {
    return <p className="rounded-[10px] border border-dashed p-8 text-center text-sm text-muted-foreground">{t("unavailable")}</p>;
  }
  const head = "px-1.5 py-2.5 text-right font-medium";
  const cell = "px-1.5 py-2 text-right tabular-nums";
  return (
    <div className="overflow-hidden rounded-[12px] border bg-card/70">
      <table className="w-full text-sm">
        <thead className="border-b text-left text-xs text-muted-foreground">
          <tr>
            <th scope="col" className="w-10 py-2.5 pr-1 pl-3 text-center font-medium">#</th>
            <th scope="col" className="px-1.5 py-2.5 font-medium">{t("team")}</th>
            <th scope="col" className={head}>
              <abbr title={t("playedLong")} className="no-underline">{t("played")}</abbr>
            </th>
            <th scope="col" className={cn(head, "max-sm:hidden")}>{t("won")}</th>
            <th scope="col" className={cn(head, "max-sm:hidden")}>{t("draw")}</th>
            <th scope="col" className={cn(head, "max-sm:hidden")}>{t("lost")}</th>
            <th scope="col" className={head}>
              <abbr title={t("goalDifferenceLong")} className="no-underline">{t("goalDifference")}</abbr>
            </th>
            <th scope="col" className={cn(head, "pl-3 text-left max-sm:hidden")}>{t("form")}</th>
            <th scope="col" className="py-2.5 pr-4 pl-1.5 text-right font-medium">{t("points")}</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row) => {
            const psg = row.teamId === PSG_TEAM_ID;
            return (
              <tr key={row.teamId} className={cn(psg && "bg-psg-blue/8 font-semibold dark:bg-foreground/8")}>
                <td className="relative py-2 pr-1 pl-3 text-center tabular-nums">
                  {/* PSG's row: the shirt's banner at the left edge, sized to the row. */}
                  {psg ? <PsgBanner className="absolute top-1/2 left-1.5 h-5 w-[7px] -translate-y-1/2" /> : null}
                  {row.position}
                </td>
                <td className="px-1.5 py-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <TeamCrest name={row.name} logo={row.crest} className="size-5" />
                    <span className="truncate">{row.name}</span>
                  </span>
                </td>
                <td className={cell}>{row.played}</td>
                <td className={cn(cell, "max-sm:hidden")}>{row.won}</td>
                <td className={cn(cell, "max-sm:hidden")}>{row.draw}</td>
                <td className={cn(cell, "max-sm:hidden")}>{row.lost}</td>
                <td className={cn(cell, "text-muted-foreground")}>{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</td>
                <td className="py-2 pr-1.5 pl-3 max-sm:hidden">
                  <span className="flex gap-1" aria-label={row.form.join(" ")}>
                    {row.form.map((result, index) => (
                      <span key={index} className={cn("size-2 rounded-full", formDot[result as keyof typeof formDot] ?? "bg-foreground/15")} />
                    ))}
                  </span>
                </td>
                <td className="py-2 pr-4 pl-1.5 text-right font-semibold tabular-nums">{row.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
