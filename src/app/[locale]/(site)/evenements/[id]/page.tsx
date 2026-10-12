import { eq } from "drizzle-orm";
import { ArrowLeft, Lock } from "lucide-react";
import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { EventRegistration } from "@/components/events/event-registration";
import { MatchMiniCard } from "@/components/matches/match-mini-card";
import { PredictionCard, type Access } from "@/components/matches/prediction-card";
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

// Phones: label + action on the first line, the value full width below. From sm: three columns.
const rowClass =
  "grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-2 border-b py-4 sm:grid-cols-[96px_minmax(0,1fr)_auto] sm:gap-y-1";
const valueClass = "col-span-2 row-start-2 text-base sm:col-span-1 sm:row-start-auto";
const sideClass = "col-start-2 row-start-1 justify-self-end sm:col-start-auto sm:row-start-auto";
const termClass = "font-wide text-[10px] font-semibold tracking-[0.06em] text-muted-foreground uppercase";
const actionClass = `${sideClass} border-b text-[13px] whitespace-nowrap text-muted-foreground transition-colors hover:border-psg-red hover:text-foreground`;

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
  const mapUrl = event.location ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}` : null;
  const when = format.dateTimeRange(event.startsAt, event.endsAt ?? event.startsAt, {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="mt-[clamp(24px,4vw,36px)] flex flex-wrap items-start gap-[clamp(32px,5vw,56px)]">
      <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-10">
        <header className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex h-[22px] items-center rounded-full bg-psg-red px-[9px] font-wide text-[9px] font-semibold tracking-[0.08em] text-white uppercase">
              {t(`types.${event.type}`)}
            </span>
            <span className="font-wide text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
              {format.dateTime(event.startsAt, { weekday: "short", day: "numeric", month: "short" })}
            </span>
            {event.membersOnly ? (
              <span className="inline-flex items-center gap-1 font-wide text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                <Lock className="size-3" aria-hidden />
                {t("membersOnly")}
              </span>
            ) : null}
          </div>
          {/* Long titles: smaller on phones, balanced lines, words may wrap rather than overflow. */}
          <h1 className="font-narrow text-[length:clamp(34px,7vw,60px)] leading-[0.92] font-extrabold tracking-[-0.01em] text-balance [overflow-wrap:anywhere] hyphens-auto uppercase italic">
            {event.title}
          </h1>
        </header>

        <dl className="flex flex-col border-t">
          <div className={rowClass}>
            <dt className={termClass}>{t("when")}</dt>
            <dd className={`${valueClass} first-letter:uppercase`}>{when}</dd>
            <a href={`/api/calendar/event/${event.id}`} className={actionClass}>
              {t("addToCalendar")}
            </a>
          </div>
          {event.location ? (
            <div className={rowClass}>
              <dt className={termClass}>{t("where")}</dt>
              <dd className={valueClass}>{event.location}</dd>
              {mapUrl ? (
                <a href={mapUrl} target="_blank" rel="noreferrer" className={actionClass}>
                  {t("openMap")}
                </a>
              ) : null}
            </div>
          ) : null}
          <div className={`${rowClass} sm:items-center`}>
            <dt className={termClass}>{t("places")}</dt>
            <dd className={`${valueClass} flex max-w-60 flex-col gap-2`}>
              <span className="text-base">
                {left === null ? t("registeredCount", { count: event.registered }) : full ? t("full") : t("placesLeft", { count: left })}
              </span>
              {event.capacity !== null ? (
                <span className="block h-[3px] overflow-hidden rounded-[2px] bg-border">
                  <span
                    className="block h-full bg-segment transition-[width] duration-400"
                    style={{ width: `${Math.max(2, Math.min(100, (event.registered / event.capacity) * 100))}%` }}
                  />
                </span>
              ) : null}
            </dd>
            <span className={`${sideClass} text-[13px] whitespace-nowrap text-muted-foreground`}>
              {event.capacity !== null
                ? t("countOf", { count: event.registered, capacity: event.capacity })
                : t("registeredCount", { count: event.registered })}
            </span>
          </div>
        </dl>

        <EventRegistration eventId={event.id} status={event.myStatus} full={full} access={access} phase={eventPhase(event)} />

        {event.description ? (
          <section className="flex flex-col gap-3">
            <h2 className={termClass}>{t("about")}</h2>
            <p className="text-lg leading-normal text-pretty whitespace-pre-line">{event.description}</p>
          </section>
        ) : null}
      </div>

      {match ? (
        <aside className="flex max-w-full min-w-0 flex-[1_1_300px] flex-col gap-4 lg:sticky lg:top-6">
          <MatchMiniCard match={match} />
          <PredictionCard match={match} access={access} memberId={member?.id ?? null} />
        </aside>
      ) : null}
    </div>
  );
}

export default async function EventPage({ params }: PageProps<"/[locale]/evenements/[id]">) {
  const t = await getTranslations("Events");
  return (
    <div>
      <Link href="/evenements" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" aria-hidden />
        {t("backToEvents")}
      </Link>
      <Suspense fallback={<p className="mt-8 text-muted-foreground">{t("loading")}</p>}>
        <EventContent params={params} />
      </Suspense>
    </div>
  );
}
