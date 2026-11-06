import { eq } from "drizzle-orm";
import { ArrowLeft, CalendarPlus } from "lucide-react";
import type { Metadata } from "next";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { EventCard } from "@/components/events/event-card";
import { EventPreview } from "@/components/events/event-preview";
import { HeadToHeadBlock, MatchFacts, MatchSheet, MembersPredictions, StandingsContext, sectionTitle } from "@/components/matches/match-details";
import { PredictionCard, type Access } from "@/components/matches/prediction-card";
import { MatchWatch } from "@/components/matches/match-watch";
import { Scoreboard } from "@/components/matches/scoreboard";
import { JsonLd } from "@/components/json-ld";
import { LockedCard } from "@/components/membership/locked-card";
import { db } from "@/db";
import { events, predictions, type Locale } from "@/db/schema";
import { Link } from "@/i18n/navigation";
import { eventAccess } from "@/lib/dues";
import { getEventsWithAttendance } from "@/lib/events";
import { getHeadToHead } from "@/lib/football/head-to-head";
import { competitionCode, getStandings } from "@/lib/football/standings";
import { summarisePredictions } from "@/lib/match-facts";
import { getMatchBySlug, isPredictionOpen, matchScore, matchTitle, PSG_NAME, type Match } from "@/lib/matches";
import { kickoffTimeKnown, matchIndexable, matchPath } from "@/lib/match-seo";
import { getCurrentMember } from "@/lib/members";
import { getSession } from "@/lib/permissions";
import { pageMetadata, publicSiteUrl } from "@/lib/seo";
import { matchBroadcaster } from "@/lib/site-settings";
import { MatchDetailSkeleton } from "@/components/skeletons";
import { Streamed } from "@/components/ui/streamed";

// Match ids only exist at runtime: rendered on the server at navigation time (no static shell,
// whose header needs the pathname).
export const instant = false;

/** Title and description of a match for search engines and shares, by where it stands. */
async function matchCopy(match: Match) {
  const t = await getTranslations("Matches.seo");
  const [format, broadcaster] = await Promise.all([getFormatter(), matchBroadcaster(match)]);
  const values = {
    match: matchTitle(match, "PSG"),
    competition: match.competition,
    date: format.dateTime(match.kickoffAt, { day: "numeric", month: "short" }),
  };
  const long = format.dateTime(match.kickoffAt, { day: "numeric", month: "long" });
  const score = matchScore(match);
  if (match.status === "finished" && score) {
    return { title: t("finished", { ...values, score }), description: t("descFinished", { ...values, score, date: long }) };
  }
  if (match.status === "postponed" || match.status === "cancelled") return { title: t("other", values), description: t("descOther", values) };
  if (!kickoffTimeKnown(match)) return { title: t("upcomingTbc", values), description: t("descUpcomingTbc", { ...values, date: long }) };
  const time = format.dateTime(match.kickoffAt, { hour: "numeric", minute: "2-digit" });
  return broadcaster
    ? { title: t("upcomingTv", values), description: t("descUpcomingTv", { ...values, date: long, time, broadcaster }) }
    : { title: t("upcoming", values), description: t("descUpcoming", { ...values, date: long, time }) };
}

export async function generateMetadata({ params }: PageProps<"/[locale]/matches/[id]">): Promise<Metadata> {
  const match = await getMatchBySlug((await params).id);
  if (!match) return { robots: { index: false } };
  const metadata = await pageMetadata({ path: matchPath(match), ...(await matchCopy(match)) });
  return matchIndexable(match) ? metadata : { ...metadata, robots: { index: false, follow: true } };
}

const EVENT_STATUS = { postponed: "EventPostponed", cancelled: "EventCancelled" } as const;

/** SportsEvent, for the big matches open to search engines (see matchIndexable). */
function matchStructuredData(match: Match, description: string, locale: string) {
  const team = (name: string) => ({ "@type": "SportsTeam", name });
  const [home, away] = match.venue === "away" ? [match.opponent, PSG_NAME] : [PSG_NAME, match.opponent];
  // The imported calendar has no stadium; at home it can only be the Parc.
  const atTheParc = match.venue === "home" && !match.stadium;
  const stadium = atTheParc ? "Parc des Princes" : match.stadium;
  const city = atTheParc ? "Paris" : match.city;
  return {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: `${home} – ${away}`,
    description,
    sport: "Soccer",
    // Only the day while the league has not fixed the time.
    startDate: kickoffTimeKnown(match) ? match.kickoffAt.toISOString() : match.kickoffAt.toISOString().slice(0, 10),
    eventStatus: `https://schema.org/${EVENT_STATUS[match.status as keyof typeof EVENT_STATUS] ?? "EventScheduled"}`,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    homeTeam: team(home),
    awayTeam: team(away),
    location: stadium ? { "@type": "Place", name: stadium, address: city ? { "@type": "PostalAddress", addressLocality: city } : stadium } : undefined,
    url: `${publicSiteUrl()}/${locale}${matchPath(match)}`,
  };
}

async function MatchContent({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const match = await getMatchBySlug((await params).id);
  if (!match) notFound();
  const id = match.id;

  const t = await getTranslations("Matches");
  const locale = await getLocale();
  const intro = match.intro?.[locale as Locale];
  const [session, member] = await Promise.all([getSession(), getCurrentMember()]);
  const access: Access = !session ? "guest" : member?.status === "active" ? "member" : "inactive";
  // Club events: for members whose fee is paid; the others see a locked sample with their next step.
  const clubAccess = eventAccess(Boolean(session), member);
  const table = competitionCode(match.competition);
  // Every extra block is optional: a source that fails or has nothing just leaves it out.
  const [visibleEvents, headToHead, standings, predictionRows] = await Promise.all([
    clubAccess === "full" ? getEventsWithAttendance(eq(events.matchId, id), member?.id ?? null) : [],
    getHeadToHead(match.externalId),
    table ? getStandings(table) : null,
    // Members' picks stay hidden while predictions are open (nobody copies the crowd).
    isPredictionOpen(match)
      ? []
      : db
          .select({ psgScore: predictions.psgScore, opponentScore: predictions.opponentScore, points: predictions.points })
          .from(predictions)
          .where(eq(predictions.matchId, id)),
  ]);
  const regulation =
    match.regulationPsgScore !== null && match.regulationOpponentScore !== null
      ? { psg: match.regulationPsgScore, opponent: match.regulationOpponentScore }
      : null;
  const predictionSummary = summarisePredictions(predictionRows, regulation);

  return (
    <div className="space-y-6">
      {matchIndexable(match) ? <JsonLd data={matchStructuredData(match, (await matchCopy(match)).description, locale)} /> : null}
      <header className="space-y-3">
        <h1 className="font-narrow text-[length:clamp(30px,5.5vw,48px)] leading-[0.95] font-extrabold tracking-[-0.01em] text-balance uppercase italic">{matchTitle(match, "PSG")}</h1>
        {intro ? <p className="max-w-prose text-[17px] leading-relaxed text-pretty whitespace-pre-line">{intro}</p> : null}
      </header>
      <Scoreboard match={match} ribbons />

      <a
        href={`/api/calendar/match/${match.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
      >
        <CalendarPlus className="size-4" aria-hidden />
        {t("addToCalendar")}
      </a>

      {match.status === "scheduled" || match.status === "live" ? <MatchWatch match={match} /> : null}

      {/* Game facts and context in the main column; prediction, members' picks and match sheet alongside. */}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="order-2 space-y-8 lg:order-1">
          <MatchFacts match={match} />
          {headToHead ? <HeadToHeadBlock match={match} data={headToHead} /> : null}
          {table && standings ? <StandingsContext match={match} rows={standings} competitionKey={table} /> : null}
          <section className="space-y-3">
            <h2 className={sectionTitle}>{t("clubEventsTitle")}</h2>
            {clubAccess !== "full" ? (
              <LockedCard
                access={clubAccess}
                feature="events"
                next={matchPath(match)}
                preview={<EventPreview opponent={match.opponent} />}
              />
            ) : visibleEvents.length > 0 ? (
              visibleEvents.map((event) => <EventCard key={event.id} event={event} access={access} showMatch={false} />)
            ) : (
              <p className="text-sm text-muted-foreground">{t("noClubEvents")}</p>
            )}
          </section>
        </div>
        <aside className="order-1 space-y-8 lg:order-2">
          <PredictionCard match={match} access={access} memberId={member?.id ?? null} />
          {predictionSummary ? <MembersPredictions match={match} summary={predictionSummary} /> : null}
          <MatchSheet match={match} />
        </aside>
      </div>
    </div>
  );
}

export default async function MatchPage({ params }: PageProps<"/[locale]/matches/[id]">) {
  const t = await getTranslations("Matches");
  return (
    <div className="space-y-6">
      <Link href="/matches" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden />
        {t("backToMatches")}
      </Link>
      <Streamed fallback={<MatchDetailSkeleton />}>
        <MatchContent params={params} />
      </Streamed>
    </div>
  );
}
