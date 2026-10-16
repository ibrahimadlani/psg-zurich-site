import { Trophy } from "lucide-react";
import { useTranslations } from "next-intl";
import { UserAvatar } from "@/components/user-avatar";
import { seasonLabel, type Trophy as TrophyRow } from "@/lib/leaderboard";
import { cn } from "@/lib/utils";

type Row = {
  memberId: string;
  rank: number;
  name: string;
  email: string;
  image: string | null;
  points: number;
  exact: number;
  played: number;
  hidden: boolean;
};

const medal = ["🥇", "🥈", "🥉"];
const trophyTone = ["text-[#d4a017]", "text-[#9aa4ad]", "text-[#b07a4a]"];

/** Podium places of past seasons, next to a name: a gold, silver or bronze cup and the season. */
export function TrophyChips({ trophies, className }: { trophies: TrophyRow[]; className?: string }) {
  const t = useTranslations("Leaderboard");
  if (trophies.length === 0) return null;
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1 align-middle", className)}>
      {trophies.map((trophy) => {
        const label = t("trophy", { rank: String(trophy.rank), season: seasonLabel(trophy.season) });
        return (
          <span
            key={trophy.season}
            title={label}
            className="inline-flex h-5 items-center gap-0.5 rounded-full border bg-background/60 px-1.5 text-[10px] font-semibold text-muted-foreground tabular-nums"
          >
            <Trophy aria-hidden className={cn("size-3", trophyTone[trophy.rank - 1])} strokeWidth={2.25} />
            <span aria-hidden>{`${String(trophy.season).slice(2)}/${String(trophy.season + 1).slice(2)}`}</span>
            <span className="sr-only">{label}</span>
          </span>
        );
      })}
    </span>
  );
}

export function LeaderboardTable({ rows, me, trophies }: { rows: Row[]; me: string | null; trophies?: Map<string, TrophyRow[]> }) {
  const t = useTranslations("Leaderboard");
  if (rows.length === 0) {
    return <p className="rounded-[10px] border border-dashed p-8 text-center text-sm text-muted-foreground">{t("empty")}</p>;
  }
  return (
    <div className="overflow-hidden rounded-[12px] border bg-card/70">
      <table className="w-full text-sm">
        <thead className="border-b text-left text-xs text-muted-foreground">
          <tr>
            <th scope="col" className="w-12 px-4 py-2.5 font-medium">{t("rank")}</th>
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
              <td className="px-2 py-2">
                <span className="flex min-w-0 items-center gap-2.5">
                  <UserAvatar name={row.name} email={row.email} image={row.image} className="size-8 text-[10px]" />
                  <span className="min-w-0">
                    <span className="break-words">{row.name}</span>
                    {row.memberId === me ? (
                      <span className="ml-1.5 text-xs font-normal text-muted-foreground">{row.hidden ? t("youHidden") : t("you")}</span>
                    ) : null}
                    <TrophyChips trophies={trophies?.get(row.memberId) ?? []} className="ml-1.5" />
                  </span>
                </span>
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

/** The top three of a finished season, second – first – third, with their pictures. */
export function Podium({ rows }: { rows: Row[] }) {
  const t = useTranslations("Leaderboard");
  const top = rows.filter((row) => row.rank <= 3);
  if (top.length === 0) return null;
  const order = [top.find((row) => row.rank === 2), top.find((row) => row.rank === 1), top.find((row) => row.rank === 3)];
  const height = ["h-16", "h-24", "h-12"];
  return (
    <section aria-label={t("podium")} className="grid grid-cols-3 items-end gap-2 sm:gap-4">
      {order.map((row, index) =>
        row ? (
          <div key={row.memberId} className="flex min-w-0 flex-col items-center gap-2 text-center">
            <UserAvatar name={row.name} email={row.email} image={row.image} className={cn(index === 1 ? "size-16 text-base" : "size-12 text-sm", "ring-2 ring-background")} />
            <span className="w-full truncate text-[13px] font-semibold">{row.name}</span>
            <span className="text-xs text-muted-foreground tabular-nums">{`${row.points} ${t("points").toLowerCase()}`}</span>
            <span
              className={cn(
                "flex w-full items-start justify-center rounded-t-[10px] border border-b-0 bg-card/70 pt-2 font-narrow text-2xl font-extrabold italic",
                height[index],
              )}
            >
              {medal[row.rank - 1]}
            </span>
          </div>
        ) : (
          <span key={index} />
        ),
      )}
    </section>
  );
}
