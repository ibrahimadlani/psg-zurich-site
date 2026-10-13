import { useFormatter, useLocale, useTranslations } from "next-intl";
import { CompetitionLabel } from "@/components/matches/match-row";
import { MatchTimeline } from "@/components/matches/match-timeline";
import { sides } from "@/components/matches/match-utils";
import { ShortName } from "@/components/matches/short-name";
import { TeamCrest } from "@/components/matches/team-crest";
import type { MatchOfficial } from "@/db/schema";
import type { HeadToHead } from "@/lib/football/head-to-head";
import type { StandingRow } from "@/lib/football/standings";
import { periodScores, timelineByPeriod, timelineTallies, type PredictionSummary } from "@/lib/match-facts";
import type { Match } from "@/lib/matches";
import { cn } from "@/lib/utils";

/*
 * Blocks of the match page. Each one only shows what the data has: a competition the API
 * covers less, or a match entered by hand, simply gets fewer blocks (never empty ones).
 */

export const sectionTitle = "font-wide text-xs font-semibold tracking-[0.08em] uppercase";
const panel = "rounded-[14px] border bg-card/70 p-5";

function Section({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("space-y-3", className)}>
      <h2 className={sectionTitle}>{title}</h2>
      {children}
    </section>
  );
}

// The API gives officials' nationality in English: mapped to ISO codes to name the country in
// the visitor's language (unknown names are shown as given).
const COUNTRIES: Record<string, string> = {
  France: "FR", Germany: "DE", Italy: "IT", Spain: "ES", England: "GB-ENG", Scotland: "GB-SCT", Wales: "GB-WLS",
  "Northern Ireland": "GB-NIR", Ireland: "IE", Portugal: "PT", Netherlands: "NL", Belgium: "BE", Switzerland: "CH",
  Austria: "AT", Poland: "PL", "Czech Republic": "CZ", Czechia: "CZ", Slovakia: "SK", Slovenia: "SI", Croatia: "HR",
  Serbia: "RS", Romania: "RO", Hungary: "HU", Greece: "GR", Turkey: "TR", Türkiye: "TR", Denmark: "DK", Sweden: "SE",
  Norway: "NO", Finland: "FI", Ukraine: "UA", Israel: "IL", Bulgaria: "BG", Georgia: "GE", Lithuania: "LT", Cyprus: "CY",
};

function countryName(name: string | null, locale: string) {
  if (!name) return null;
  const code = COUNTRIES[name];
  if (!code || code.includes("-")) return name;
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? name;
  } catch {
    return name;
  }
}

const officialRole = (type: string) =>
  type === "REFEREE"
    ? "referee"
    : type.startsWith("ASSISTANT")
      ? "assistant"
      : type.startsWith("FOURTH")
        ? "fourth"
        : type.startsWith("VIDEO")
          ? "var"
          : "other";

/** Competition, date, venue and officials: the rows we have. */
export function MatchSheet({ match }: { match: Match }) {
  const t = useTranslations("Matches.details");
  const format = useFormatter();
  const locale = useLocale();
  const officials: MatchOfficial[] = match.officials?.length
    ? match.officials
    : match.referee
      ? [{ name: match.referee, type: "REFEREE", nationality: null }]
      : [];

  const rows: { label: string; value: React.ReactNode }[] = [
    { label: t("competition"), value: <CompetitionLabel match={match} short className="text-sm text-foreground" /> },
    {
      label: t("kickoff"),
      value: format.dateTime(match.kickoffAt, { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }),
    },
    ...(match.stadium ? [{ label: t("venue"), value: [match.stadium, match.city].filter(Boolean).join(", ") }] : []),
    { label: t("side"), value: t(`sides.${match.venue}`) },
    ...officials.map((official) => {
      const country = countryName(official.nationality, locale);
      return {
        label: t(`officials.${officialRole(official.type)}`),
        value: (
          <>
            {official.name}
            {country ? <span className="text-muted-foreground"> · {country}</span> : null}
          </>
        ),
      };
    }),
  ];

  return (
    <Section title={t("sheet")}>
      <dl className={cn(panel, "divide-y p-0")}>
        {rows.map((row, index) => (
          // Label above the value: the sheet sits in the narrow side column.
          <div key={index} className="flex flex-col gap-0.5 px-5 py-3">
            <dt className="text-xs text-muted-foreground">{row.label}</dt>
            <dd className="min-w-0 text-sm">{row.value}</dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}

/** Two-sided bar for a "PSG n — n opponent" figure. */
function SplitBar({ label, psg, opponent, psgFirst }: { label: string; psg: number; opponent: number; psgFirst: boolean }) {
  const [left, right] = psgFirst ? [psg, opponent] : [opponent, psg];
  const total = left + right || 1;
  const leftIsPsg = psgFirst;
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between text-sm tabular-nums">
        <span className={cn(leftIsPsg && "font-semibold")}>{left}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className={cn(!leftIsPsg && "font-semibold")}>{right}</span>
      </div>
      <div className="flex h-1.5 gap-1">
        <div className="flex flex-1 justify-end overflow-hidden rounded-full bg-foreground/8">
          <div className={cn("h-full rounded-full", leftIsPsg ? "bg-psg-blue dark:bg-foreground" : "bg-foreground/35")} style={{ width: `${(left / total) * 100}%` }} />
        </div>
        <div className="flex-1 overflow-hidden rounded-full bg-foreground/8">
          <div className={cn("h-full rounded-full", !leftIsPsg ? "bg-psg-blue dark:bg-foreground" : "bg-foreground/35")} style={{ width: `${(right / total) * 100}%` }} />
        </div>
      </div>
    </div>
  );
}

/** Team names above a two-sided block, in scoreboard order. */
function TeamsHeader({ match }: { match: Match }) {
  const [home, away] = sides(match);
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      {[home, away].map((team, index) => (
        <span key={team.name} className={cn("flex min-w-0 items-center gap-2", index === 1 && "flex-row-reverse text-right", team.isPsg && "font-semibold")}>
          <TeamCrest name={team.name} logo={team.logo} className="size-5" />
          <span className="truncate">
            <ShortName name={team.name} />
          </span>
        </span>
      ))}
    </div>
  );
}

/**
 * Game facts: score of each period (always known once played), then everything the timeline
 * has — goals, cards, substitutions — counted and in order, period by period.
 */
export function MatchFacts({ match }: { match: Match }) {
  const t = useTranslations("Matches.details");
  if (match.status !== "live" && match.status !== "finished") return null;
  const psgFirst = match.venue !== "away";
  const periods = periodScores(match);
  const timeline = match.timeline ?? [];
  const tallies = timelineTallies(timeline);
  const groups = timelineByPeriod(timeline);
  const ordered = (psg: number, opponent: number) => (psgFirst ? `${psg} – ${opponent}` : `${opponent} – ${psg}`);

  return (
    <Section title={t("facts")}>
      <div className={cn(panel, "space-y-5")}>
        <TeamsHeader match={match} />

        {periods.length > 0 ? (
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {periods.map((period) => (
              <div key={period.key} className="rounded-[10px] bg-foreground/[0.04] px-3 py-2.5 text-center">
                <dt className="text-[11px] text-muted-foreground">{t(`periods.${period.key}`)}</dt>
                <dd className="font-narrow text-xl font-extrabold tabular-nums italic">{ordered(period.psg, period.opponent)}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        {tallies.length > 0 ? (
          <div className="space-y-3">
            {tallies.map((row) => (
              <SplitBar key={row.key} label={t(`tallies.${row.key}`)} psg={row.tally.psg} opponent={row.tally.opponent} psgFirst={psgFirst} />
            ))}
          </div>
        ) : null}

        {groups.length > 0 ? (
          <div className="space-y-4 border-t pt-4">
            {groups.map((group) => (
              <div key={group.key} className="space-y-2">
                <p className="text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">{t(`periods.${group.key}`)}</p>
                <MatchTimeline entries={group.entries} psgFirst={psgFirst} withSubstitutions />
              </div>
            ))}
          </div>
        ) : (
          // Free data plan and hand-entered matches: no scorers, cards or substitutions.
          <p className="border-t pt-4 text-sm text-pretty text-muted-foreground">{t("noTimeline")}</p>
        )}
      </div>
    </Section>
  );
}

/** Both teams in the competition table (current standings). */
export function StandingsContext({ match, rows, competitionKey }: { match: Match; rows: StandingRow[]; competitionKey: "FL1" | "CL" }) {
  const t = useTranslations("Matches.details");
  const tStandings = useTranslations("Matches.standings");
  const psgRow = rows.find((row) => row.teamId === 524);
  const opponentRow = rows.find((row) => row.teamId === match.opponentExternalId);
  if (!psgRow || !opponentRow) return null;
  // Table order (the better-placed team first), not home/away order.
  const ordered = psgRow.position <= opponentRow.position ? [psgRow, opponentRow] : [opponentRow, psgRow];
  const dot = { W: "bg-emerald-500", D: "bg-foreground/30", L: "bg-psg-red" } as const;

  return (
    <Section title={t(competitionKey === "FL1" ? "standingsLigue1" : "standingsCl")}>
      <div className={cn(panel, "overflow-x-auto p-0")}>
        <table className="w-full text-sm">
          <thead className="border-b text-xs text-muted-foreground">
            <tr>
              <th className="w-10 py-2.5 pl-4 text-left font-medium">#</th>
              <th className="py-2.5 text-left font-medium">{tStandings("team")}</th>
              <th className="px-2 py-2.5 text-right font-medium">{tStandings("played")}</th>
              <th className="px-2 py-2.5 text-right font-medium">{tStandings("goalDifference")}</th>
              <th className="px-2 py-2.5 text-left font-medium max-sm:hidden">{tStandings("form")}</th>
              <th className="py-2.5 pr-4 text-right font-medium">{tStandings("points")}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {ordered.map((row) => (
              <tr key={row.teamId} className={cn(row.teamId === 524 && "font-semibold")}>
                <td className="py-2.5 pl-4 tabular-nums">{row.position}</td>
                <td className="py-2.5">
                  <span className="flex items-center gap-2">
                    <TeamCrest name={row.name} logo={row.crest} className="size-5" />
                    {row.name}
                  </span>
                </td>
                <td className="px-2 py-2.5 text-right tabular-nums">{row.played}</td>
                <td className="px-2 py-2.5 text-right text-muted-foreground tabular-nums">{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</td>
                <td className="px-2 py-2.5 max-sm:hidden">
                  <span className="flex gap-1">
                    {row.form.map((result, index) => (
                      <span key={index} className={cn("size-2 rounded-full", dot[result as keyof typeof dot] ?? "bg-foreground/15")} />
                    ))}
                  </span>
                </td>
                <td className="py-2.5 pr-4 text-right tabular-nums">{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

/** Record against this opponent and the last meetings. */
export function HeadToHeadBlock({ match, data }: { match: Match; data: HeadToHead }) {
  const t = useTranslations("Matches.details");
  const format = useFormatter();
  const total = data.played || 1;
  const parts = [
    { key: "wins", value: data.wins, className: "bg-psg-blue dark:bg-foreground" },
    { key: "draws", value: data.draws, className: "bg-foreground/30" },
    { key: "losses", value: data.losses, className: "bg-psg-red" },
  ] as const;

  return (
    <Section title={t("headToHead", { opponent: match.opponent })}>
      <div className={cn(panel, "space-y-4")}>
        <div className="grid grid-cols-3 text-center">
          {parts.map((part) => (
            <div key={part.key}>
              <p className="font-narrow text-3xl font-extrabold tabular-nums italic">{part.value}</p>
              <p className="text-xs text-muted-foreground">{t(`record.${part.key}`, { count: part.value })}</p>
            </div>
          ))}
        </div>
        <div className="flex h-2 gap-0.5 overflow-hidden rounded-full" aria-hidden>
          {parts.map((part) => (part.value ? <div key={part.key} className={part.className} style={{ width: `${(part.value / total) * 100}%` }} /> : null))}
        </div>
        <p className="text-center text-xs text-muted-foreground">
          {t("record.summary", { played: data.played, scored: data.goalsFor, conceded: data.goalsAgainst })}
        </p>
        <ul className="divide-y border-t">
          {data.meetings.slice(0, 5).map((meeting) => {
            const result =
              meeting.psgScore !== meeting.opponentScore
                ? meeting.psgScore > meeting.opponentScore
                  ? "W"
                  : "L"
                : meeting.penalties
                  ? meeting.penalties.psg > meeting.penalties.opponent
                    ? "W"
                    : "L"
                  : "D";
            const [home, away] = meeting.psgHome ? ["PSG", match.opponent] : [match.opponent, "PSG"];
            const score = meeting.psgHome ? `${meeting.psgScore} – ${meeting.opponentScore}` : `${meeting.opponentScore} – ${meeting.psgScore}`;
            return (
              <li key={meeting.id} className="flex items-center gap-3 py-2.5 text-sm">
                <span
                  className={cn(
                    "grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-semibold",
                    result === "W" ? "bg-psg-blue text-white dark:bg-foreground dark:text-background" : result === "L" ? "bg-psg-red text-white" : "bg-foreground/15",
                  )}
                >
                  {t(`record.short.${result}`)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate">
                    {home} <span className="font-semibold tabular-nums">{score}</span> {away}
                    {meeting.penalties ? <span className="text-muted-foreground"> ({t("record.onPenalties")})</span> : null}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {format.dateTime(new Date(meeting.date), { day: "numeric", month: "short", year: "numeric" })} · {meeting.competition}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </Section>
  );
}

/** What members predicted (shown once predictions are closed, so nobody copies). */
export function MembersPredictions({ match, summary }: { match: Match; summary: PredictionSummary }) {
  const t = useTranslations("Matches.details.predictions");
  const format = useFormatter();
  const percent = (value: number) => format.number(value, { style: "percent", maximumFractionDigits: 0 });
  const ordered = (psg: number, opponent: number) => (match.venue === "away" ? `${opponent} – ${psg}` : `${psg} – ${opponent}`);
  const parts = [
    { key: "win", value: summary.shares.win, className: "bg-psg-blue dark:bg-foreground" },
    { key: "draw", value: summary.shares.draw, className: "bg-foreground/30" },
    { key: "loss", value: summary.shares.loss, className: "bg-psg-red" },
  ] as const;

  return (
    <Section title={t("title")}>
      <div className={cn(panel, "space-y-4")}>
        <p className="text-sm text-muted-foreground">{t("count", { count: summary.count })}</p>
        <div className="flex h-2 gap-0.5 overflow-hidden rounded-full" aria-hidden>
          {parts.map((part) => (part.value ? <div key={part.key} className={part.className} style={{ width: `${part.value * 100}%` }} /> : null))}
        </div>
        <dl className="grid grid-cols-3 text-center">
          {parts.map((part) => (
            <div key={part.key}>
              <dd className="text-base font-semibold tabular-nums">{percent(part.value)}</dd>
              <dt className="text-xs text-muted-foreground">{t(part.key)}</dt>
            </div>
          ))}
        </dl>
        <div className="space-y-1.5 border-t pt-3">
          <p className="text-xs text-muted-foreground">{t("topScores")}</p>
          <ul className="flex flex-wrap gap-2">
            {summary.topScores.map((score) => (
              <li key={`${score.psg}-${score.opponent}`} className="rounded-full border px-3 py-1 text-sm tabular-nums">
                <span className="font-semibold">{ordered(score.psg, score.opponent)}</span>
                <span className="text-muted-foreground"> × {score.count}</span>
              </li>
            ))}
          </ul>
        </div>
        {summary.exact !== null || summary.averagePoints !== null ? (
          <p className="border-t pt-3 text-sm">
            {summary.exact !== null ? t("exact", { count: summary.exact }) : null}
            {summary.averagePoints !== null ? (
              <span className="text-muted-foreground"> · {t("average", { points: format.number(summary.averagePoints, { maximumFractionDigits: 1 }) })}</span>
            ) : null}
          </p>
        ) : null}
      </div>
    </Section>
  );
}
