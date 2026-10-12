import { Lock, MapPin, Users } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { EventSignup } from "@/components/events/event-signup";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import type { EventView } from "@/lib/events";

/** A club event: type, schedule, place, places left, sign-up. */
export function EventCard({
  event,
  access,
  showMatch = true,
}: {
  event: EventView;
  access: "member" | "guest" | "inactive";
  showMatch?: boolean;
}) {
  const t = useTranslations("Events");
  const format = useFormatter();
  const full = event.capacity !== null && event.registered >= event.capacity;
  const left = event.capacity === null ? null : Math.max(0, event.capacity - event.registered);

  return (
    <article className="flex flex-col gap-4 rounded-[12px] border bg-card/70 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{t(`types.${event.type}`)}</Badge>
          {event.membersOnly ? (
            <Badge variant="outline" className="gap-1">
              <Lock className="size-3" aria-hidden />
              {t("membersOnly")}
            </Badge>
          ) : null}
        </div>
        <h3 className="text-base font-semibold">{event.title}</h3>
        <p className="text-sm text-muted-foreground">
          {format.dateTimeRange(event.startsAt, event.endsAt ?? event.startsAt, {
            weekday: "long",
            day: "numeric",
            month: "long",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
        {event.location ? (
          <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
            <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            {event.location}
          </p>
        ) : null}
        {event.description ? <p className="text-sm whitespace-pre-line">{event.description}</p> : null}
        {showMatch && event.match ? (
          <Link href={`/matchs/${event.match.id}`} className="inline-block text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground">
            {t("linkedMatch", { opponent: event.match.opponent })}
          </Link>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users className="size-3.5" aria-hidden />
          {left === null ? t("registeredCount", { count: event.registered }) : full ? t("full") : t("placesLeft", { count: left })}
        </span>
        <EventSignup eventId={event.id} status={event.myStatus} full={full} access={access} />
      </div>
    </article>
  );
}
