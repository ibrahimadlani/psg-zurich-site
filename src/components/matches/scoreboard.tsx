import { useFormatter, useTranslations } from "next-intl";
import { CompetitionLabel } from "@/components/matches/match-row";
import { MatchTimeline } from "@/components/matches/match-timeline";
import { sides, toDate, type MatchView } from "@/components/matches/match-utils";
import { TeamCrest } from "@/components/matches/team-crest";
import { cn } from "@/lib/utils";

/** Big score block: crests, score (or kick-off time), live minute, penalties, goal timeline. */
export function Scoreboard({ match, className }: { match: MatchView; className?: string }) {
  const t = useTranslations("Matches");
  const format = useFormatter();
  const [home, away] = sides(match);
  const live = match.status === "live";
  const played = live || match.status === "finished";

  const centre = played ? (
    <span className="font-narrow text-[length:clamp(44px,9vw,64px)] leading-none font-extrabold tabular-nums italic">
      {home.score ?? 0}
      <span className="px-2 text-muted-foreground">–</span>
      {away.score ?? 0}
    </span>
  ) : (
    <span className="font-narrow text-[length:clamp(32px,7vw,44px)] leading-none font-extrabold italic">
      {format.dateTime(toDate(match.kickoffAt), { hour: "2-digit", minute: "2-digit" })}
    </span>
  );

  return (
    <div className={cn("rounded-[14px] border bg-card/70 p-5 sm:p-7", className)}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <CompetitionLabel match={match} className="text-[13px]" />
        {live ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-psg-red px-2.5 py-1 text-[11px] font-semibold text-white uppercase">
            <span className="size-1.5 animate-pulse rounded-full bg-white" aria-hidden />
            {match.statusDetail === "HT" ? t("halftime") : t("liveMinute", { minute: match.elapsed ?? 0 })}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">
            {format.dateTime(toDate(match.kickoffAt), { weekday: "long", day: "numeric", month: "long" })}
          </span>
        )}
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
        {[home, away].map((team, index) => (
          <div
            key={team.name}
            className={cn("flex flex-col items-center gap-2 text-center", index === 1 ? "order-3" : "order-1")}
          >
            <TeamCrest name={team.name} logo={team.logo} className="size-14 sm:size-16" />
            <span className={cn("text-sm leading-tight sm:text-base", team.isPsg && "font-semibold")}>{team.name}</span>
          </div>
        ))}
        <div className="order-2 flex flex-col items-center gap-1">
          {centre}
          {home.penalties !== null && away.penalties !== null ? (
            <span className="text-xs text-muted-foreground">{t("penalties", { home: home.penalties, away: away.penalties })}</span>
          ) : null}
          {match.status === "finished" ? <span className="text-xs text-muted-foreground uppercase">{t("fullTime")}</span> : null}
        </div>
      </div>

      {match.timeline && match.timeline.length > 0 ? (
        <div className="mt-6 border-t pt-4">
          <MatchTimeline entries={match.timeline} psgFirst={home.isPsg} />
        </div>
      ) : null}
    </div>
  );
}
