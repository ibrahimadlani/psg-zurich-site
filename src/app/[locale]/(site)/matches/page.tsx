import { and, count, eq, inArray } from "drizzle-orm";
import { CalendarPlus, Trophy } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { ChampionsLeagueLogo, Ligue1Logo } from "@/components/matches/competition-logos";
import { LazyList } from "@/components/lazy-list";
import { LiveMatches } from "@/components/matches/live-matches";
import { MatchRow, type PredictionView } from "@/components/matches/match-row";
import { FixturesAndTables } from "@/components/matches/fixtures-and-tables";
import { MatchTabs, panelTitle } from "@/components/matches/match-tabs";
import { Scoreboard } from "@/components/matches/scoreboard";
import { StandingsTable } from "@/components/matches/standings-table";
import { db } from "@/db";
import { events, predictions } from "@/db/schema";
import { Link } from "@/i18n/navigation";
import { isDuesPaid } from "@/lib/dues";
import { getStandings } from "@/lib/football/standings";
import { closestMatch, getSeasonMatches } from "@/lib/matches";
import { getCurrentMember } from "@/lib/members";
import { MatchesSkeleton } from "@/components/skeletons";
import { Streamed } from "@/components/ui/streamed";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Matches");
  return { title: t("title"), description: t("description") };
}

async function MatchesContent() {
  await connection();
  const t = await getTranslations("Matches");
  const [season, member, ligue1, championsLeague] = await Promise.all([
    getSeasonMatches(),
    getCurrentMember(),
    getStandings("FL1"),
    getStandings("CL"),
  ]);
  const ids = season.map((match) => match.id);

  const [eventCounts, myPredictions] = await Promise.all([
    // Club events are for members whose fee is paid.
    isDuesPaid(member) && ids.length
      ? db.select({ matchId: events.matchId, value: count() }).from(events).where(inArray(events.matchId, ids)).groupBy(events.matchId)
      : [],
    member?.status === "active" && ids.length
      ? db
          .select()
          .from(predictions)
          .where(and(eq(predictions.memberId, member.id), inArray(predictions.matchId, ids)))
      : [],
  ]);
  const eventsByMatch = new Map(eventCounts.map((row) => [row.matchId, row.value]));
  const predictionByMatch = new Map<string, PredictionView>(myPredictions.map((row) => [row.matchId, row]));

  const live = season.filter((match) => match.status === "live");
  // Nothing on right now: the next or the last match, whichever is closer in time.
  const featured = live.length === 0 ? closestMatch(season) : null;
  const upcoming = season.filter((match) => match.status === "scheduled" || match.status === "postponed");
  const results = season.filter((match) => match.status === "finished" || match.status === "cancelled").reverse();

  const list = (items: typeof season, empty: string) =>
    items.length ? (
      // A full season is ~60 matches: rendered 10 at a time as the list scrolls.
      <LazyList
        className="space-y-2.5"
        items={items.map((match) => (
          <MatchRow
            key={match.id}
            match={match}
            eventCount={eventsByMatch.get(match.id) ?? 0}
            prediction={predictionByMatch.get(match.id)}
          />
        ))}
      />
    ) : (
      <p className="rounded-[10px] border border-dashed p-8 text-center text-sm text-muted-foreground">{empty}</p>
    );

  const tables = (compact: boolean) => [
    {
      id: "ligue1",
      title: t("titles.ligue1"),
      label: (
        <>
          <Ligue1Logo className="size-3 text-current" />
          {t("standings.ligue1")}
        </>
      ),
      content: <StandingsTable rows={ligue1} compact={compact} />,
    },
    {
      id: "championsLeague",
      title: t("titles.championsLeague"),
      label: (
        <>
          <ChampionsLeagueLogo className="size-3.5 text-current dark:text-current" />
          {t("standings.championsLeague")}
        </>
      ),
      content: <StandingsTable rows={championsLeague} compact={compact} />,
    },
  ];

  // A discreet label instead of a page header: what the big scoreboard shows.
  const heading = live.length > 0 ? t("live") : featured ? t(featured.kind === "next" ? "nextMatch" : "lastMatch") : null;

  return (
    <div className="space-y-8">
      <section className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          {heading ? (
            <h2 className={panelTitle}>{heading}</h2>
          ) : (
            <span />
          )}
          {/* Hidden on phones to keep the top of the page to the match. */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted-foreground max-sm:hidden">
            <Link href="/matches/leaderboard" prefetch={false} className={quietLink}>
              <Trophy className="size-3.5" aria-hidden />
              {t("leaderboard")}
            </Link>
            {/* webcal:// opens the calendar app's "subscribe" dialog. */}
            <a href="webcal://psg-zurich.ch/api/calendar/psg-zurich.ics" className={quietLink}>
              <CalendarPlus className="size-3.5" aria-hidden />
              {t("subscribe")}
            </a>
          </div>
        </div>
        <LiveMatches initial={live} />
        {featured ? (
          <Link href={`/matches/${featured.match.id}`} className="block transition-opacity hover:opacity-90">
            <Scoreboard match={featured.match} />
          </Link>
        ) : null}
      </section>
      <FixturesAndTables
        fixtures={
          <MatchTabs
            labels={{ upcoming: t("upcoming"), results: t("results") }}
            titles={{ upcoming: t("titles.upcoming"), results: t("titles.results") }}
            upcoming={list(upcoming, t("noUpcoming"))}
            results={list(results, t("noResults"))}
            extra={tables(false)}
            extraClassName="lg:hidden"
            filters={[
              {
                id: "ligue1",
                label: (
                  <>
                    <Ligue1Logo className="size-3 text-current" />
                    {t("standings.ligue1")}
                  </>
                ),
                upcoming: list(upcoming.filter(isLigue1), t("noUpcoming")),
                results: list(results.filter(isLigue1), t("noResults")),
              },
              {
                id: "championsLeague",
                label: (
                  <>
                    <ChampionsLeagueLogo className="size-3.5 text-current dark:text-current" />
                    {t("standings.championsLeague")}
                  </>
                ),
                upcoming: list(upcoming.filter(isChampionsLeague), t("noUpcoming")),
                results: list(results.filter(isChampionsLeague), t("noResults")),
              },
            ]}
          />
        }
        compact={tables(true)}
        full={tables(false)}
        labels={{ aside: t("standings.title"), expand: t("standings.expand"), collapse: t("standings.collapse") }}
      />
    </div>
  );
}

const isLigue1 = (match: { competition: string }) => match.competition === "Ligue 1";
const isChampionsLeague = (match: { competition: string }) => /champions league/i.test(match.competition);

const quietLink = "inline-flex items-center gap-1.5 transition-colors hover:text-foreground";

export default async function MatchesPage() {
  const t = await getTranslations("Matches");
  return (
    <>
      {/* The page title stays for screen readers and the browser tab; the screen shows the match. */}
      <h1 className="sr-only">{t("title")}</h1>
      <Streamed fallback={<MatchesSkeleton />}>
        <MatchesContent />
      </Streamed>
    </>
  );
}
