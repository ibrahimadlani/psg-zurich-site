import { eq } from "drizzle-orm";
import { ArrowLeft, CalendarPlus, MapPin, Whistle } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { EventCard } from "@/components/events/event-card";
import { PredictionCard, type Access } from "@/components/matches/prediction-card";
import { Scoreboard } from "@/components/matches/scoreboard";
import { events } from "@/db/schema";
import { Link } from "@/i18n/navigation";
import { getEventsWithAttendance } from "@/lib/events";
import { getMatch, matchTitle } from "@/lib/matches";
import { getCurrentMember } from "@/lib/members";
import { getSession } from "@/lib/permissions";

// Match ids only exist at runtime: rendered on the server at navigation time (no static shell,
// whose header needs the pathname).
export const instant = false;

export async function generateMetadata({ params }: PageProps<"/[locale]/matchs/[id]">): Promise<Metadata> {
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
  const clubEvents = await getEventsWithAttendance(eq(events.matchId, id), member?.id ?? null);
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

      {/* Club events in the main column, the prediction card alongside (above them on mobile). */}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <section className="order-2 space-y-3 lg:order-1">
          <h2 className="text-lg font-semibold">{t("clubEventsTitle")}</h2>
          {visibleEvents.length > 0 ? (
            visibleEvents.map((event) => <EventCard key={event.id} event={event} access={access} showMatch={false} />)
          ) : (
            <p className="text-sm text-muted-foreground">{t("noClubEvents")}</p>
          )}
        </section>
        <aside className="order-1 lg:sticky lg:top-6 lg:order-2">
          <PredictionCard match={match} access={access} memberId={member?.id ?? null} />
        </aside>
      </div>
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
