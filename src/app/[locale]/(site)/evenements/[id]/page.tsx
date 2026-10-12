import { eq } from "drizzle-orm";
import { ArrowLeft, CalendarPlus, Clock, Lock, MapPin, Users } from "lucide-react";
import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { EventSignup } from "@/components/events/event-signup";
import { MatchRow } from "@/components/matches/match-row";
import { PredictionCard, type Access } from "@/components/matches/prediction-card";
import { Badge } from "@/components/ui/badge";
import { db } from "@/db";
import { events } from "@/db/schema";
import { Link } from "@/i18n/navigation";
import { eventPhase, getEventsWithAttendance } from "@/lib/events";
import { getMatch } from "@/lib/matches";
import { getCurrentMember } from "@/lib/members";
import { getSession } from "@/lib/permissions";

// Event ids only exist at runtime: rendered on the server at navigation time (like match pages).
export const instant = false;

export async function generateMetadata({ params }: PageProps<"/[locale]/evenements/[id]">): Promise<Metadata> {
  const [event] = await db
    .select({ title: events.title, description: events.description, membersOnly: events.membersOnly })
    .from(events)
    .where(eq(events.id, (await params).id));
  // Members-only events: no title for visitors (the page itself is a 404 for them), never indexed.
  if (!event || (event.membersOnly && !(await getSession()))) return {};
  return {
    title: event.title,
    description: event.membersOnly ? undefined : event.description?.slice(0, 160),
    robots: event.membersOnly ? { index: false } : undefined,
  };
}

async function EventContent({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const t = await getTranslations("Events");
  const format = await getFormatter();
  const [session, member] = await Promise.all([getSession(), getCurrentMember()]);
  const access: Access = !session ? "guest" : member?.status === "active" ? "member" : "inactive";

  const [event] = await getEventsWithAttendance(eq(events.id, id), member?.id ?? null);
  // Members-only events don't exist for visitors (they are hidden from every list too).
  if (!event || (event.membersOnly && access === "guest")) notFound();
  const match = event.matchId ? await getMatch(event.matchId) : null;

  const full = event.capacity !== null && event.registered >= event.capacity;
  const left = event.capacity === null ? null : Math.max(0, event.capacity - event.registered);
  const phase = eventPhase(event);
  const mapUrl = event.location ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}` : null;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
      <div className="min-w-0 space-y-6">
        <header className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{t(`types.${event.type}`)}</Badge>
            {event.membersOnly ? (
              <Badge variant="outline" className="gap-1">
                <Lock className="size-3" aria-hidden />
                {t("membersOnly")}
              </Badge>
            ) : null}
          </div>
          <h1 className="font-narrow text-[length:clamp(32px,6vw,48px)] leading-[0.95] font-extrabold uppercase italic">{event.title}</h1>
        </header>

        <dl className="grid gap-4 rounded-[12px] border bg-card/70 p-4 text-sm sm:grid-cols-2 sm:p-5">
          <div className="flex gap-3">
            <Clock className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
            <div>
              <dt className="sr-only">{t("when")}</dt>
              <dd className="font-medium first-letter:uppercase">
                {format.dateTimeRange(event.startsAt, event.endsAt ?? event.startsAt, {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </dd>
              <dd>
                <a href={`/api/calendar/event/${event.id}`} className="inline-flex items-center gap-1.5 text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
                  <CalendarPlus className="size-3.5" aria-hidden />
                  {t("addToCalendar")}
                </a>
              </dd>
            </div>
          </div>
          {event.location ? (
            <div className="flex gap-3">
              <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
              <div>
                <dt className="sr-only">{t("where")}</dt>
                <dd className="font-medium">{event.location}</dd>
                {mapUrl ? (
                  <dd>
                    <a href={mapUrl} target="_blank" rel="noreferrer" className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
                      {t("openMap")}
                    </a>
                  </dd>
                ) : null}
              </div>
            </div>
          ) : null}
          <div className="flex items-start gap-3 sm:col-span-2 sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <Users className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
              <div>
                <dt className="sr-only">{t("places")}</dt>
                <dd className="font-medium">
                  {left === null ? t("registeredCount", { count: event.registered }) : full ? t("full") : t("placesLeft", { count: left })}
                </dd>
                {event.capacity !== null ? (
                  <dd className="text-muted-foreground">{t("capacity", { registered: event.registered, capacity: event.capacity })}</dd>
                ) : null}
              </div>
            </div>
            {phase !== "open" ? (
              <p className="text-sm text-muted-foreground">{t(phase === "over" ? "over" : "started")}</p>
            ) : (
              <EventSignup eventId={event.id} status={event.myStatus} full={full} access={access} />
            )}
          </div>
        </dl>

        {event.description ? (
          <section className="space-y-2">
            <h2 className="text-lg font-semibold">{t("about")}</h2>
            <p className="text-[15px] leading-relaxed whitespace-pre-line">{event.description}</p>
          </section>
        ) : null}

        {match ? (
          <section className="space-y-2">
            <h2 className="text-lg font-semibold">{t("theMatch")}</h2>
            <MatchRow match={match} />
          </section>
        ) : null}
      </div>

      {match ? (
        <aside className="lg:sticky lg:top-6">
          <PredictionCard match={match} access={access} memberId={member?.id ?? null} withMatch />
        </aside>
      ) : null}
    </div>
  );
}

export default async function EventPage({ params }: PageProps<"/[locale]/evenements/[id]">) {
  const t = await getTranslations("Events");
  return (
    <div className="space-y-6">
      <Link href="/evenements" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden />
        {t("backToEvents")}
      </Link>
      <Suspense fallback={<p className="text-muted-foreground">{t("loading")}</p>}>
        <EventContent params={params} />
      </Suspense>
    </div>
  );
}
