import { CalendarDays } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { CompetitionLabel, liveLabel } from "@/components/matches/match-row";
import { asideCard, sides, toDate, type MatchView } from "@/components/matches/match-utils";
import { ShortName } from "@/components/matches/short-name";
import { TeamCrest } from "@/components/matches/team-crest";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/** Compact scoreboard: competition, crests, kick-off time (or score), calendar link (and `action` beside it). */
export function MatchMiniCard({
  match,
  action,
  bare = false,
}: {
  match: MatchView;
  action?: React.ReactNode;
  /** Content only, without the card's frame (the frame belongs to the caller). */
  bare?: boolean;
}) {
  const t = useTranslations("Matches");
  const format = useFormatter();
  const [home, away] = sides(match);
  const played = match.status === "live" || match.status === "finished";

  return (
    <section className={bare ? "flex flex-col gap-5" : cn(asideCard, "p-5")}>
      <div className="flex items-center justify-between gap-3">
        <CompetitionLabel match={match} className="text-[13px]" />
        <span className="flex items-center gap-3">
          {action}
          <a href={`/api/calendar/match/${match.id}`} aria-label={t("addToCalendar")} className="inline-flex text-muted-foreground transition-colors hover:text-foreground">
            <CalendarDays className="size-4" aria-hidden />
          </a>
        </span>
      </div>
      <Link href={`/matchs/${match.id}`} className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 transition-opacity hover:opacity-85">
        {[home, away].map((team, index) => (
          <span key={team.name} className={cn("flex flex-col items-center gap-2.5 text-center", index === 0 ? "order-1" : "order-3")}>
            <TeamCrest name={team.name} logo={team.logo} className="size-12" />
            <span className={cn("text-[15px] leading-tight", team.isPsg && "font-semibold")}><ShortName name={team.name} /></span>
          </span>
        ))}
        <span className="order-2 flex flex-col items-center gap-1">
          <span className="font-narrow text-4xl leading-none font-extrabold tabular-nums italic">
            {played ? `${home.score ?? 0}–${away.score ?? 0}` : format.dateTime(toDate(match.kickoffAt), { hour: "2-digit", minute: "2-digit" })}
          </span>
          <span className="font-wide text-[9px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
            {match.status === "live" ? liveLabel(match, t) : match.status === "finished" ? t("fullTime") : t("kickoff")}
          </span>
        </span>
      </Link>
    </section>
  );
}
