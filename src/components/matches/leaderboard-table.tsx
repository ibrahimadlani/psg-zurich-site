import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

type Row = { memberId: string; rank: number; name: string; points: number; exact: number; played: number };

const medal = ["🥇", "🥈", "🥉"];

export function LeaderboardTable({ rows, me }: { rows: Row[]; me: string | null }) {
  const t = useTranslations("Leaderboard");
  if (rows.length === 0) {
    return <p className="rounded-[10px] border border-dashed p-8 text-center text-sm text-muted-foreground">{t("empty")}</p>;
  }
  return (
    <div className="overflow-hidden rounded-[12px] border bg-card/70">
      <table className="w-full text-sm">
        <thead className="border-b text-left text-xs text-muted-foreground">
          <tr>
            <th scope="col" className="w-14 px-4 py-2.5 font-medium">{t("rank")}</th>
            <th scope="col" className="px-2 py-2.5 font-medium">{t("member")}</th>
            <th scope="col" className="px-2 py-2.5 text-right font-medium">{t("exact")}</th>
            <th scope="col" className="hidden px-2 py-2.5 text-right font-medium sm:table-cell">{t("played")}</th>
            <th scope="col" className="px-4 py-2.5 text-right font-medium">{t("points")}</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row) => (
            <tr key={row.memberId} className={cn(row.memberId === me && "bg-psg-blue/8 font-semibold dark:bg-foreground/8")}>
              <td className="px-4 py-2.5 tabular-nums">{row.rank <= 3 ? medal[row.rank - 1] : row.rank}</td>
              <td className="px-2 py-2.5">
                {row.name}
                {row.memberId === me ? <span className="ml-1.5 text-xs font-normal text-muted-foreground">{t("you")}</span> : null}
              </td>
              <td className="px-2 py-2.5 text-right tabular-nums">{row.exact}</td>
              <td className="hidden px-2 py-2.5 text-right tabular-nums sm:table-cell">{row.played}</td>
              <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{row.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
