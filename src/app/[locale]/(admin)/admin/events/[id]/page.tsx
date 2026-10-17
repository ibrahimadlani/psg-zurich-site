import { ArrowLeft, Clock, MapPin } from "lucide-react";
import type { Metadata } from "next";
import { getFormatter, getNow, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { AttendeesBoard } from "@/components/admin/events/attendees-board";
import { EventAdminActions } from "@/components/admin/events/event-admin-actions";
import { AdminForbidden } from "@/components/admin/ui/admin-header";
import { StatusPill } from "@/components/admin/ui/status-pill";
import { adminLabel } from "@/components/admin/ui/styles";
import { MatchBadge } from "@/components/events/match-badge";
import { AdminDetailSkeleton } from "@/components/skeletons";
import { Link } from "@/i18n/navigation";
import { adminPage } from "@/lib/admin/guard";
import { adminEventDetail, matchOptions } from "@/lib/admin/events-query";
import { matchTitle } from "@/lib/matches";
import { can } from "@/lib/roles";

// Event ids only exist at runtime.
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("AdminShell");
  return { title: t("sections.events"), robots: { index: false } };
}

async function EventAdminDetail({ id }: { id: string }) {
  await connection();
  const [t, tEvents, format, now] = await Promise.all([getTranslations("AdminEvents"), getTranslations("Events"), getFormatter(), getNow()]);
  const session = await adminPage("events");
  if (!session) return <AdminForbidden message={(await getTranslations("Admin"))("forbidden")} />;
  const [detail, options] = await Promise.all([adminEventDetail(id), matchOptions((date) => format.dateTime(date, { day: "numeric", month: "short" }))]);
  if (!detail) notFound();
  const { event, match, form, attendees } = detail;
  // The linked match stays a choice even once played (else saving would unlink it).
  const choices =
    match && !options.some((option) => option.id === match.id)
      ? [{ id: match.id, label: `${format.dateTime(match.kickoffAt, { day: "numeric", month: "short" })} · ${matchTitle(match, "PSG")} (${match.competition})`, title: matchTitle(match, "PSG"), kickoff: form.startsAt }, ...options]
      : options;
  const ends = event.endsAt ?? new Date(event.startsAt.getTime() + 3 * 60 * 60 * 1000);
  const upcoming = ends > now;
  const live = upcoming && event.startsAt <= now;
  const withPlace = attendees.filter((person) => person.status === "registered" || person.status === "attended");

  return (
    <article className="space-y-8">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex h-[22px] items-center rounded-full bg-psg-red px-[9px] font-wide text-[9px] font-semibold tracking-[0.08em] text-white uppercase">
            {tEvents(`types.${event.type}`)}
          </span>
          {live ? <StatusPill tone="ok">{t("live")}</StatusPill> : !upcoming ? <StatusPill>{t("past")}</StatusPill> : null}
          {match ? <MatchBadge match={match} /> : null}
        </div>
        <h1 className="font-narrow text-[length:clamp(32px,6vw,52px)] leading-[0.92] font-extrabold text-balance [overflow-wrap:anywhere] uppercase italic">{event.title}</h1>
        <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-[14px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-3.5" aria-hidden />
            {format.dateTime(event.startsAt, { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
            {event.endsAt ? ` – ${format.dateTime(event.endsAt, { hour: "2-digit", minute: "2-digit" })}` : ""}
          </span>
          {event.location || event.address ? (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-3.5" aria-hidden />
              {event.location ?? event.address}
            </span>
          ) : null}
        </div>
      </header>

      <EventAdminActions
        eventId={event.id}
        title={event.title}
        form={form}
        matchOptions={choices}
        emails={withPlace.map((person) => person.email)}
        upcoming={upcoming}
        canMail={can(session.user.role, "mailing")}
      />

      <AttendeesBoard eventId={event.id} attendees={attendees} capacity={event.capacity} />

      {event.description ? (
        <section className="space-y-2">
          <h2 className={adminLabel}>{t("description")}</h2>
          <p className="text-[15px] text-pretty whitespace-pre-line text-muted-foreground">{event.description}</p>
        </section>
      ) : null}
    </article>
  );
}

export default async function AdminEventPage({ params }: PageProps<"/[locale]/admin/events/[id]">) {
  const t = await getTranslations("AdminEvents");
  const { id } = await params;
  return (
    <div className="space-y-5">
      {/* Phones only: on a computer the list stays on the left. */}
      <Link
        href="/admin/events"
        className="inline-flex items-center gap-2 font-wide text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase transition-colors hover:text-foreground lg:hidden"
      >
        <ArrowLeft className="size-3" aria-hidden />
        {t("back")}
      </Link>
      <Suspense fallback={<AdminDetailSkeleton />}>
        <EventAdminDetail id={id} />
      </Suspense>
    </div>
  );
}
