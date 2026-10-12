import { and, eq } from "drizzle-orm";
import { ArrowLeft, CalendarPlus, MapPin, Whistle } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { EventCard } from "@/components/events/event-card";
import { PredictionForm } from "@/components/matches/prediction-form";
import { Scoreboard } from "@/components/matches/scoreboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { events, predictions } from "@/db/schema";
import { Link } from "@/i18n/navigation";
import { getEventsWithAttendance } from "@/lib/events";
import { getMatch, isPredictionOpen, matchTitle } from "@/lib/matches";
import { getCurrentMember } from "@/lib/members";
import { getSession } from "@/lib/permissions";

// Match ids only exist at runtime: rendered on the server at navigation time (no static shell,
// whose header needs the pathname).
export const instant = false;

export async function generateMetadata({ params }: PageProps<"/[locale]/matchs/[id]">): Promise<Metadata> {
  const match = await getMatch((await params).id);
  return { title: match ? `${matchTitle(match, "PSG")} · ${match.competition}` : undefined };
}

/** Distribution of the community's predictions (shown once predictions are closed). */
async function communityStats(matchId: string) {
  const rows = await db.select({ psg: predictions.psgScore, other: predictions.opponentScore }).from(predictions).where(eq(predictions.matchId, matchId));
  const win = rows.filter((row) => row.psg > row.other).length;
  const draw = rows.filter((row) => row.psg === row.other).length;
  return { total: rows.length, win, draw, loss: rows.length - win - draw };
}

async function MatchContent({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const match = await getMatch(id);
  if (!match) notFound();

  const t = await getTranslations("Matches");
  const tp = await getTranslations("Predictions");
  const [session, member] = await Promise.all([getSession(), getCurrentMember()]);
  const access = !session ? "guest" : member?.status === "active" ? "member" : "inactive";
  const open = isPredictionOpen(match);

  const [clubEvents, [mine], stats] = await Promise.all([
    getEventsWithAttendance(eq(events.matchId, id), member?.id ?? null),
    access === "member" && member
      ? db.select().from(predictions).where(and(eq(predictions.matchId, id), eq(predictions.memberId, member.id)))
      : Promise.resolve([]),
    open ? null : communityStats(id),
  ]);
  const visibleEvents = access === "guest" ? clubEvents.filter((event) => !event.membersOnly) : clubEvents;

  return (
    <div className="space-y-6">
      <Scoreboard match={match} />

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
        {match.stadium ? (
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-4" aria-hidden />
            {[match.stadium, match.city].filter(Boolean).join(", ")}
          </span>
        ) : null}
        {match.referee ? (
          <span className="inline-flex items-center gap-1.5">
            <Whistle className="size-4" aria-hidden />
            {match.referee}
          </span>
        ) : null}
        <a href={`/api/calendar/match/${match.id}`} className="inline-flex items-center gap-1.5 underline-offset-2 hover:text-foreground hover:underline">
          <CalendarPlus className="size-4" aria-hidden />
          {t("addToCalendar")}
        </a>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{tp("title")}</CardTitle>
          <CardDescription>
            {open ? tp("openHint") : mine?.points != null ? tp("yourPoints", { count: mine.points }) : tp("closedHint")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {open && access === "member" ? (
            <PredictionForm
              matchId={match.id}
              psgHome={match.venue !== "away"}
              opponent={match.opponent}
              initial={mine ? { psgScore: mine.psgScore, opponentScore: mine.opponentScore } : null}
            />
          ) : null}
          {open && access === "guest" ? (
            <Link href="/connexion" prefetch={false} className="text-sm underline underline-offset-2">
              {tp("signIn")}
            </Link>
          ) : null}
          {open && access === "inactive" ? <p className="text-sm text-muted-foreground">{tp("membersOnly")}</p> : null}
          {!open && mine ? (
            <p className="text-sm">{tp("yourPrediction", { psg: mine.psgScore, opponent: mine.opponentScore })}</p>
          ) : null}
          {stats && stats.total > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">{tp("community", { count: stats.total })}</p>
              <div className="flex h-2.5 overflow-hidden rounded-full bg-foreground/10">
                <span className="bg-emerald-600" style={{ width: `${(stats.win / stats.total) * 100}%` }} />
                <span className="bg-foreground/40" style={{ width: `${(stats.draw / stats.total) * 100}%` }} />
                <span className="bg-psg-red" style={{ width: `${(stats.loss / stats.total) * 100}%` }} />
              </div>
              <p className="flex justify-between text-xs text-muted-foreground">
                <span>{tp("win", { percent: Math.round((stats.win / stats.total) * 100) })}</span>
                <span>{tp("draw", { percent: Math.round((stats.draw / stats.total) * 100) })}</span>
                <span>{tp("loss", { percent: Math.round((stats.loss / stats.total) * 100) })}</span>
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t("clubEventsTitle")}</h2>
        {visibleEvents.length > 0 ? (
          visibleEvents.map((event) => <EventCard key={event.id} event={event} access={access} showMatch={false} />)
        ) : (
          <p className="text-sm text-muted-foreground">{t("noClubEvents")}</p>
        )}
      </section>
    </div>
  );
}

export default async function MatchPage({ params }: PageProps<"/[locale]/matchs/[id]">) {
  const t = await getTranslations("Matches");
  return (
    <div className="space-y-6">
      <Link href="/matchs" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden />
        {t("backToMatches")}
      </Link>
      <Suspense fallback={<p className="text-muted-foreground">{t("loading")}</p>}>
        <MatchContent params={params} />
      </Suspense>
    </div>
  );
}
