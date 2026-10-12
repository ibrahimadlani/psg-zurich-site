import { and, count, eq, inArray } from "drizzle-orm";
import { CalendarPlus, Trophy } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { Suspense } from "react";
import { LiveMatches } from "@/components/matches/live-matches";
import { MatchRow, type PredictionView } from "@/components/matches/match-row";
import { MatchTabs } from "@/components/matches/match-tabs";
import { Scoreboard } from "@/components/matches/scoreboard";
import { PageHeader } from "@/components/page-header";
import { db } from "@/db";
import { events, predictions } from "@/db/schema";
import { Link } from "@/i18n/navigation";
import { closestMatch, getSeasonMatches } from "@/lib/matches";
import { getCurrentMember } from "@/lib/members";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Matches");
  return { title: t("title"), description: t("description") };
}

async function MatchesContent() {
  await connection();
  const t = await getTranslations("Matches");
  const [season, member] = await Promise.all([getSeasonMatches(), getCurrentMember()]);
  const ids = season.map((match) => match.id);

  const [eventCounts, myPredictions] = await Promise.all([
    ids.length
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
      <div className="space-y-2.5">
        {items.map((match) => (
          <MatchRow
            key={match.id}
            match={match}
            eventCount={eventsByMatch.get(match.id) ?? 0}
            prediction={predictionByMatch.get(match.id)}
          />
        ))}
      </div>
    ) : (
      <p className="rounded-[10px] border border-dashed p-8 text-center text-sm text-muted-foreground">{empty}</p>
    );

  return (
    <div className="space-y-8">
      <LiveMatches initial={live} />
      {featured ? (
        <section className="space-y-2">
          <h2 className="font-wide text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
            {t(featured.kind === "next" ? "nextMatch" : "lastMatch")}
          </h2>
          <Link href={`/matchs/${featured.match.id}`} className="block transition-opacity hover:opacity-90">
            <Scoreboard match={featured.match} />
          </Link>
        </section>
      ) : null}
      <MatchTabs
        labels={{ upcoming: t("upcoming"), results: t("results") }}
        upcoming={list(upcoming, t("noUpcoming"))}
        results={list(results, t("noResults"))}
      />
    </div>
  );
}

export default async function MatchesPage() {
  const t = await getTranslations("Matches");
  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-4 [&>div:first-child]:mb-0">
        <PageHeader title={t("title")} description={t("description")} />
        <div className="flex flex-wrap gap-2">
          <Link
            href="/matchs/classement"
            prefetch={false}
            className="inline-flex h-9 items-center gap-2 rounded-[8px] border bg-card/60 px-3 text-sm transition-colors hover:border-foreground/30"
          >
            <Trophy className="size-4" aria-hidden />
            {t("leaderboard")}
          </Link>
          {/* webcal:// opens the calendar app's "subscribe" dialog. */}
          <a
            href="webcal://psg-zurich.ch/api/calendar/psg-zurich.ics"
            className="inline-flex h-9 items-center gap-2 rounded-[8px] border bg-card/60 px-3 text-sm transition-colors hover:border-foreground/30"
          >
            <CalendarPlus className="size-4" aria-hidden />
            {t("subscribe")}
          </a>
        </div>
      </div>
      <Suspense fallback={<p className="text-muted-foreground">{t("loading")}</p>}>
        <MatchesContent />
      </Suspense>
    </>
  );
}
