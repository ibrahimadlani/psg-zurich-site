import { desc, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/db";
import { matches, predictions } from "@/db/schema";
import { Link } from "@/i18n/navigation";
import { TrophyChips } from "@/components/matches/leaderboard-table";
import { getLeaderboard, trophiesOf } from "@/lib/leaderboard";
import { matchTitle } from "@/lib/matches";
import { cn } from "@/lib/utils";

/** My rank (season, month) and my latest predictions with their points. */
export async function MyPredictions({ memberId }: { memberId: string }) {
  const t = await getTranslations("MemberArea");
  const [season, month, history, trophies] = await Promise.all([
    getLeaderboard("season", memberId),
    getLeaderboard("month", memberId),
    db
      .select({
        matchId: matches.id,
        opponent: matches.opponent,
        venue: matches.venue,
        competition: matches.competition,
        psg: predictions.psgScore,
        other: predictions.opponentScore,
        resultPsg: matches.regulationPsgScore,
        resultOther: matches.regulationOpponentScore,
        points: predictions.points,
      })
      .from(predictions)
      .innerJoin(matches, eq(matches.id, predictions.matchId))
      .where(eq(predictions.memberId, memberId))
      .orderBy(desc(matches.kickoffAt))
      .limit(10),
    trophiesOf([memberId]),
  ]);
  const myTrophies = trophies.get(memberId) ?? [];
  const mine = (rows: typeof season) => rows.find((row) => row.memberId === memberId);
  const stats = [
    { label: t("predictions.rankSeason"), row: mine(season), total: season.length },
    { label: t("predictions.rankMonth"), row: mine(month), total: month.length },
  ];

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-wide text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">{t("predictions.title")}</h2>
        <Link href="/matches/leaderboard" prefetch={false} className="text-[13px] text-muted-foreground hover:text-foreground">
          {t("predictions.leaderboard")}
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {stats.map(({ label, row, total }) => (
          <div key={label} className="rounded-[12px] border bg-card/70 p-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="font-narrow text-3xl font-extrabold tabular-nums italic">
              {row ? `${row.rank}${total ? ` / ${total}` : ""}` : "—"}
            </p>
            <p className="text-xs text-muted-foreground">{row ? t("predictions.points", { count: row.points }) : t("predictions.notRanked")}</p>
          </div>
        ))}
      </div>
      {myTrophies.length ? (
        <div className="flex flex-wrap items-center gap-2 rounded-[12px] border bg-card/70 px-4 py-3">
          <span className="text-xs text-muted-foreground">{t("predictions.trophies")}</span>
          <TrophyChips trophies={myTrophies} />
        </div>
      ) : null}
      {history.length > 0 ? (
        <ul className="divide-y overflow-hidden rounded-[12px] border bg-card/70 text-sm">
          {history.map((row) => (
            <li key={row.matchId}>
              <Link href={`/matches/${row.matchId}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-foreground/[0.03]">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{matchTitle(row, "PSG")}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {t("predictions.mine", { psg: row.psg, opponent: row.other })}
                    {row.resultPsg !== null ? ` · ${t("predictions.result", { psg: row.resultPsg, opponent: row.resultOther ?? 0 })}` : ""}
                  </span>
                </span>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
                    row.points === null ? "text-muted-foreground" : row.points > 0 ? "bg-ok/15 text-ok" : "bg-foreground/10",
                  )}
                >
                  {row.points === null ? t("predictions.pending") : t("predictions.points", { count: row.points })}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-[12px] border border-dashed p-5 text-sm text-muted-foreground">
          {t("predictions.empty")}{" "}
          <Link href="/matches" className="text-foreground underline underline-offset-2">
            {t("predictions.browse")}
          </Link>
        </p>
      )}
    </section>
  );
}
