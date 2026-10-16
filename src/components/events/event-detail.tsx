import { and, eq } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { EventParticipants } from "@/components/events/event-participants";
import { EventRegistration } from "@/components/events/event-registration";
import { EventTravelTime } from "@/components/events/event-travel-time";
import { EventWhen } from "@/components/events/event-when";
import { HumanDate } from "@/components/human-date";
import { EventPlaceMap } from "@/components/events/event-place-map";
import { dayIn } from "@/lib/human-date";
import { MatchMiniCard } from "@/components/matches/match-mini-card";
import { BackToMatch, MatchPredictionSwitch, PredictionToggle } from "@/components/matches/match-prediction-switch";
import { PredictionCardBody, type Access } from "@/components/matches/prediction-card";
import { db } from "@/db";
import { events, predictions } from "@/db/schema";
import { redirect } from "@/i18n/navigation";
import { isDuesPaid } from "@/lib/dues";
import { eventParticipants, eventPhase, getEventsWithAttendance } from "@/lib/events";
import { mapsEnabled, mapsLink } from "@/lib/google-maps";
import { getMatch } from "@/lib/matches";
import { getCurrentMember } from "@/lib/members";
import { getSession } from "@/lib/permissions";
import { directionsLink, homeAddress, routeTimesEnabled } from "@/lib/route-time";
import { withReturn } from "@/lib/return-to";

// Phones: label + action on the first line, the value full width below. From sm: three columns.
const rowClass =
  "grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-2 border-b py-4 sm:grid-cols-[96px_minmax(0,1fr)_auto] sm:gap-y-1";
const valueClass = "col-span-2 row-start-2 text-base sm:col-span-1 sm:row-start-auto";
const sideClass = "col-start-2 row-start-1 justify-self-end sm:col-start-auto sm:row-start-auto";
const termClass = "font-wide text-[10px] font-semibold tracking-[0.06em] text-muted-foreground uppercase";
const actionClass = `${sideClass} border-b text-[13px] whitespace-nowrap text-muted-foreground transition-colors hover:border-psg-red hover:text-foreground`;

/**
 * Everything about one event (when, where, places, sign-up, map, linked match): the right-hand
 * panel of /evenements on a computer, the whole page on a phone.
 */
export async function EventDetail({ id }: { id: string }) {
  await connection();
  const [t, tPredictions, tMatches] = await Promise.all([
    getTranslations("Events"),
    getTranslations("Predictions"),
    getTranslations("Matches"),
  ]);
  const [session, member] = await Promise.all([getSession(), getCurrentMember()]);
  const access: Access = !session ? "guest" : member?.status === "active" ? "member" : "inactive";

  // Events are for members whose fee is paid: anyone else lands on the showcase. A visitor
  // comes back to this event once signed in.
  if (!isDuesPaid(member)) {
    redirect({ href: session ? "/evenements" : withReturn("/evenements", `/evenements/${id}`), locale: await getLocale() });
  }
  const [event] = await getEventsWithAttendance(eq(events.id, id), member?.id ?? null);
  if (!event) notFound();
  const [match, participants, [myPrediction]] = await Promise.all([
    event.matchId ? getMatch(event.matchId) : null,
    eventParticipants(id),
    event.matchId && member
      ? db
          .select({ psgScore: predictions.psgScore, opponentScore: predictions.opponentScore })
          .from(predictions)
          .where(and(eq(predictions.matchId, event.matchId), eq(predictions.memberId, member.id)))
      : [],
  ]);
  // Once saved, the card's link shows the prediction itself ("Mon prono : 2 – 1", home side first).
  const predictionLabel = myPrediction
    ? tMatches("myPrediction", {
        score:
          match?.venue === "away"
            ? `${myPrediction.opponentScore} – ${myPrediction.psgScore}`
            : `${myPrediction.psgScore} – ${myPrediction.opponentScore}`,
      })
    : tPredictions("title");

  const full = event.capacity !== null && event.registered >= event.capacity;
  const left = event.capacity === null ? null : Math.max(0, event.capacity - event.registered);
  const place = event.address || event.location;
  const mapUrl = place ? mapsLink(place, event.placeId) : null;
  const located = event.latitude !== null && event.longitude !== null;
  // The drive from home, while the event is still ahead and both places are known.
  const home = member ? homeAddress(member) : null;
  const showDrive = routeTimesEnabled() && located && home !== null && eventPhase(event) === "open";
  const overDays = event.endsAt !== null && dayIn(event.startsAt, "Europe/Zurich") !== dayIn(event.endsAt, "Europe/Zurich");

  return (
    <div className="mt-[clamp(24px,4vw,36px)] flex flex-wrap items-start gap-[clamp(32px,5vw,56px)] lg:mt-0">
      <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-10">
        <header className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex h-[22px] items-center rounded-full bg-psg-red px-[9px] font-wide text-[9px] font-semibold tracking-[0.08em] text-white uppercase">
              {t(`types.${event.type}`)}
            </span>
            <span className="font-wide text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
              <HumanDate date={event.startsAt} absolute={{ weekday: "short", day: "numeric", month: "short" }} />
            </span>
          </div>
          {/* Long titles: smaller on phones, balanced lines, words may wrap rather than overflow. */}
          <h1 className="font-narrow text-[length:clamp(34px,7vw,60px)] leading-[0.92] font-extrabold tracking-[-0.01em] text-balance [overflow-wrap:anywhere] hyphens-auto uppercase italic">
            {event.title}
          </h1>
        </header>

        <dl className="flex flex-col border-t">
          {/* A trip over two days (out and back): departure here, return on its own row. */}
          <div className={rowClass}>
            <dt className={termClass}>{t("when")}</dt>
            <dd className={valueClass}>
              <EventWhen startsAt={event.startsAt} endsAt={overDays ? null : event.endsAt} />
            </dd>
            <a href={`/api/calendar/event/${event.id}`} className={actionClass}>
              {t("addToCalendar")}
            </a>
          </div>
          {overDays && event.endsAt ? (
            <div className={rowClass}>
              <dt className={termClass}>{t("returnTrip")}</dt>
              <dd className={valueClass}>
                <EventWhen startsAt={event.endsAt} endsAt={null} />
              </dd>
            </div>
          ) : null}
          <div className={`${rowClass} sm:items-center`}>
            <dt className={termClass}>{t("withWho")}</dt>
            <dd className={valueClass}>
              <EventParticipants participants={participants} me={member?.id ?? null} />
            </dd>
            {/* Places left on the right (nothing when the event has no limit). */}
            {left !== null ? (
              <span className={`${sideClass} text-[13px] whitespace-nowrap text-muted-foreground`}>
                {full ? t("full") : t("placesLeft", { count: left })}
              </span>
            ) : null}
          </div>
          {/* Last: its map unfolds under the row. */}
          {place ? (
            <div className={rowClass}>
              <dt className={termClass}>{t("where")}</dt>
              <dd className={valueClass}>
                {event.location ?? event.address}
                {event.location && event.address ? (
                  <span className="mt-0.5 block text-[14px] text-muted-foreground">{event.address}</span>
                ) : null}
              </dd>
              {located && mapsEnabled ? (
                <EventPlaceMap
                  latitude={event.latitude!}
                  longitude={event.longitude!}
                  label={event.location || event.address || ""}
                  // From the member's home when we know it, else the place itself.
                  directionsUrl={showDrive ? directionsLink(home!, { latitude: event.latitude!, longitude: event.longitude! }, event.placeId) : mapUrl}
                  buttonClassName={actionClass}
                  labels={{ show: t("openMap"), hide: t("hideMap"), directions: t("directions") }}
                  drive={
                    showDrive ? (
                      <Suspense fallback={null}>
                        <EventTravelTime origin={home!} destination={{ latitude: event.latitude!, longitude: event.longitude! }} />
                      </Suspense>
                    ) : null
                  }
                />
              ) : mapUrl ? (
                // No coordinates (or maps off): Google Maps in a new tab, as before.
                <a href={mapUrl} target="_blank" rel="noreferrer" className={actionClass}>
                  {t("openMap")}
                </a>
              ) : null}
            </div>
          ) : null}
        </dl>

        <EventRegistration eventId={event.id} status={event.myStatus} full={full} access={access} phase={eventPhase(event)} startsAt={event.startsAt} />

        {event.description ? (
          <section className="flex flex-col gap-3">
            <h2 className={termClass}>{t("about")}</h2>
            <p className="text-lg leading-normal text-pretty whitespace-pre-line">{event.description}</p>
          </section>
        ) : null}

        {/* The linked match, after the programme; its card turns into the prediction. */}
        {match ? (
          <section className="flex flex-col gap-3">
            <h2 className={termClass}>{t("theMatch")}</h2>
            <div className="max-w-xl">
              <MatchPredictionSwitch
                matchFace={<MatchMiniCard bare match={match} action={<PredictionToggle label={predictionLabel} />} />}
                predictionFace={
                  <PredictionCardBody
                    bare
                    match={match}
                    access={access}
                    memberId={member?.id ?? null}
                    header={<BackToMatch label={t("backToMatch")} />}
                  />
                }
              />
            </div>
          </section>
        ) : null}
      </div>


    </div>
  );
}

