import { CalendarClock, Users } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { HumanDate } from "@/components/human-date";
import { CompetitionLogo, hasLocalLogo } from "@/components/matches/competition-logos";
import { outcome, roundInfo, sides, toDate, type MatchView } from "@/components/matches/match-utils";
import { RivalryBadge, rivalryFrame, rivalryOf } from "@/components/matches/rivalry";
import { ShortName } from "@/components/matches/short-name";
import { TeamCrest } from "@/components/matches/team-crest";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export type PredictionView = { psgScore: number; opponentScore: number; points: number | null };

/**
 * Competition + round, e.g. "Ligue 1 · Matchday 9". `short`: the Champions League always as its
 * local abbreviation ("LDC · Phase de ligue · J3"), for narrow spots like the match sheet.
 */
export function CompetitionLabel({ match, className, short = false }: { match: MatchView; className?: string; short?: boolean }) {
  const t = useTranslations("Matches");
  const round = roundInfo(match.round);
  const roundLabel = !round
    ? null
    : round.kind === "other"
      ? round.label
      : round.kind === "stage"
        ? t(`stages.${round.stage}`)
        : t(round.kind === "matchday" ? "matchday" : "leaguePhase", { number: round.number });
  return (
    <span className={cn("flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground", className)}>
      {hasLocalLogo(match.competition) ? (
        <CompetitionLogo competition={match.competition} className="size-4" />
      ) : match.competitionLogo ? (
        // eslint-disable-next-line @next/next/no-img-element -- remote logo
        <img src={match.competitionLogo} alt="" width={16} height={16} loading="lazy" className="size-4 shrink-0 object-contain" />
      ) : null}
      <span className="truncate">
        {short && /champions league/i.test(match.competition) ? t("standings.championsLeague") : <ShortName name={match.competition} />}
        {roundLabel ? ` · ${roundLabel}` : null}
      </span>
    </span>
  );
}

/** "Half-time", "Live · 63'", or just "Live" when the minute is unknown (free plan). */
export function liveLabel(match: MatchView, t: ReturnType<typeof useTranslations<"Matches">>) {
  if (match.statusDetail === "HT") return t("halftime");
  return match.elapsed ? t("liveMinute", { minute: match.elapsed }) : t("live");
}

const resultStyles = {
  win: "bg-emerald-600 text-white",
  draw: "bg-foreground/15 text-foreground",
  loss: "bg-psg-red text-white",
} as const;

/** One match in a list: date, teams, score or kick-off time, linked events, my prediction. */
export function MatchRow({
  match,
  prediction,
  eventCount = 0,
}: {
  match: MatchView;
  prediction?: PredictionView | null;
  eventCount?: number;
}) {
  const t = useTranslations("Matches");
  const format = useFormatter();
  const kickoff = toDate(match.kickoffAt);
  const [home, away] = sides(match);
  const result = outcome(match);
  const played = match.status === "finished" || match.status === "live";
  const rivalry = rivalryOf(match);

  return (
    <Link
      href={`/matches/${match.id}`}
      className={cn(
        "group grid grid-cols-[4.5rem_1fr_auto] items-center gap-3 rounded-[10px] border bg-card/60 p-3 transition-colors hover:border-foreground/30 sm:grid-cols-[6rem_1fr_auto] sm:gap-5 sm:p-4",
        rivalryFrame(rivalry, home.isPsg ? "top" : "bottom"),
        rivalry && "rivalry-raised",
      )}
    >
      <span className="flex flex-col text-xs leading-tight">
        <HumanDate
          date={kickoff}
          absolute={{ weekday: "short", day: "numeric", month: "short" }}
          withTime={false}
          className="font-semibold text-foreground uppercase"
        />
        <span className="text-muted-foreground">{format.dateTime(kickoff, { hour: "2-digit", minute: "2-digit" })}</span>
      </span>

      <span className="flex min-w-0 flex-col gap-1.5">
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <CompetitionLabel match={match} />
          {rivalry ? <RivalryBadge rivalry={rivalry} /> : null}
        </span>
        <span className="flex min-w-0 flex-col gap-1 text-sm sm:text-[15px]">
          {[home, away].map((team) => (
            <span key={team.name} className="flex min-w-0 items-center gap-2">
              <TeamCrest name={team.name} logo={team.logo} className="size-5" />
              <span className={cn("truncate", team.isPsg ? "font-semibold" : "")}>
                <ShortName name={team.name} />
              </span>
              {played ? <span className="ml-auto pl-2 font-mono font-semibold tabular-nums">{team.score ?? "–"}</span> : null}
            </span>
          ))}
        </span>
        <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {eventCount > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-psg-blue/10 px-2 py-0.5 text-psg-blue dark:bg-foreground/10 dark:text-foreground">
              <Users className="size-3" aria-hidden />
              {t("clubEvents", { count: eventCount })}
            </span>
          ) : null}
          {prediction ? (
            <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5">
              {t("myPrediction", { score: `${prediction.psgScore}-${prediction.opponentScore}` })}
              {prediction.points !== null ? ` · ${t("points", { count: prediction.points })}` : null}
            </span>
          ) : null}
        </span>
      </span>

      <span className="flex flex-col items-end gap-1">
        {match.status === "live" ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-psg-red px-2 py-0.5 text-[11px] font-semibold text-white uppercase">
            <span className="size-1.5 animate-pulse rounded-full bg-white" aria-hidden />
            {liveLabel(match, t)}
          </span>
        ) : result ? (
          <span className={cn("grid size-6 place-items-center rounded-[6px] text-[11px] font-bold", resultStyles[result])}>
            {t(`result.${result}`)}
          </span>
        ) : match.status === "postponed" || match.status === "cancelled" ? (
          <span className="text-xs text-muted-foreground">{t(`status.${match.status}`)}</span>
        ) : (
          <CalendarClock className="size-4 text-muted-foreground transition-colors group-hover:text-foreground" aria-hidden />
        )}
      </span>
    </Link>
  );
}
