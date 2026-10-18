import { eq } from "drizzle-orm";
import { ArrowLeft, CalendarPlus } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { EventCard } from "@/components/events/event-card";
import { EventPreview } from "@/components/events/event-preview";
import { HeadToHeadBlock, MatchFacts, MatchSheet, MembersPredictions, StandingsContext, sectionTitle } from "@/components/matches/match-details";
import { PredictionCard, type Access } from "@/components/matches/prediction-card";
import { Scoreboard } from "@/components/matches/scoreboard";
import { LockedCard } from "@/components/membership/locked-card";
import { db } from "@/db";
import { events, predictions } from "@/db/schema";
import { Link } from "@/i18n/navigation";
import { eventAccess } from "@/lib/dues";
import { getEventsWithAttendance } from "@/lib/events";
import { getHeadToHead } from "@/lib/football/head-to-head";
import { competitionCode, getStandings } from "@/lib/football/standings";
import { summarisePredictions } from "@/lib/match-facts";
import { getMatch, isPredictionOpen, matchTitle } from "@/lib/matches";
import { getCurrentMember } from "@/lib/members";
import { getSession } from "@/lib/permissions";
import { MatchDetailSkeleton } from "@/components/skeletons";
import { Streamed } from "@/components/ui/streamed";

// Match ids only exist at runtime: rendered on the server at navigation time (no static shell,
// whose header needs the pathname).
export const instant = false;

export async function generateMetadata({ params }: PageProps<"/[locale]/matches/[id]">): Promise<Metadata> {
  const match = await getMatch((await params).id);
  return { title: match ? `${matchTitle(match, "PSG")} · ${match.competition}` : undefined };
}

async function MatchContent({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const match = await getMatch(id);
  if (!match) notFound();

  const t = await getTranslations("Matches");
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
      <Scoreboard match={match} ribbons />

      <a
        href={`/api/calendar/match/${match.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
      >
        <CalendarPlus className="size-4" aria-hidden />
        {t("addToCalendar")}
      </a>

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
                next={`/matches/${match.id}`}
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
