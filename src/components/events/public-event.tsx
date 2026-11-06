import { ArrowRight, CalendarDays, Lock, MapPin } from "lucide-react";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { JsonLd } from "@/components/json-ld";
import { Link } from "@/i18n/navigation";
import { eventIsOver, type publicEvent } from "@/lib/events";
import { signInHref } from "@/lib/return-to";
import { shareImage, publicSiteUrl } from "@/lib/seo";
import { clubPublisher } from "@/lib/structured-data";

type PublicEventData = NonNullable<Awaited<ReturnType<typeof publicEvent>>>;

/** An event seen from outside the club: what, when, in which city, and the way in. */
export async function PublicEvent({ event }: { event: PublicEventData }) {
  const t = await getTranslations("PublicEvent");
  const types = await getTranslations("Events.types");
  const [format, locale] = await Promise.all([getFormatter(), getLocale()]);
  const teaser = t(`teaser.${event.type}`);
  const past = eventIsOver(event);
  const site = publicSiteUrl();
  return (
    <article className="mt-[clamp(24px,4vw,36px)] flex max-w-[44rem] flex-col gap-6 lg:mt-0">
      {/* Only what is on this page: never the place, the description or who comes. */}
      {past ? null : (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "Event",
            name: event.title,
            description: `${teaser} ${t("reserved")}.`,
            startDate: event.startsAt.toISOString(),
            endDate: event.endsAt?.toISOString(),
            eventStatus: "https://schema.org/EventScheduled",
            eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
            location: { "@type": "Place", name: event.city, address: { "@type": "PostalAddress", addressLocality: event.city, addressCountry: "CH" } },
            organizer: clubPublisher(),
            image: [`${site}${shareImage(locale).url}`],
            url: `${site}/${locale}/events/${event.id}`,
          }}
        />
      )}
      <header className="flex flex-col gap-4">
        <span className="inline-flex h-[22px] items-center self-start rounded-full bg-psg-red px-[9px] font-wide text-[9px] font-semibold tracking-[0.08em] text-white uppercase">{types(event.type)}</span>
        <h1 className="font-narrow text-[length:clamp(34px,7vw,60px)] leading-[0.92] font-extrabold tracking-[-0.01em] text-balance [overflow-wrap:anywhere] uppercase italic">{event.title}</h1>
      </header>
      <dl className="flex flex-col border-y text-base">
        <div className="flex items-center gap-3 border-b py-3.5">
          <CalendarDays className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <dt className="sr-only">{t("when")}</dt>
          <dd className="first-letter:uppercase">{format.dateTime(event.startsAt, { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</dd>
        </div>
        <div className="flex items-center gap-3 py-3.5">
          <MapPin className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <dt className="sr-only">{t("where")}</dt>
          <dd>{event.city}</dd>
        </div>
      </dl>
      <p className="text-[17px] leading-relaxed text-pretty text-muted-foreground">{past ? t("past") : teaser}</p>
      <div className="flex flex-col gap-4 rounded-[16px] border bg-card p-5 shadow-brand">
        <p className="flex items-center gap-2 text-[14px] font-semibold">
          <Lock className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          {t("reserved")}
        </p>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <Link href="/join" className="inline-flex h-12 items-center gap-2 rounded-[10px] bg-segment px-6 font-wide text-[12px] font-semibold tracking-[0.06em] text-segment-foreground uppercase shadow-brand transition-opacity hover:opacity-90">
            {t("join")}
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
          <Link href={signInHref(`/events/${event.id}`)} prefetch={false} className="border-b pb-0.5 text-[14px] transition-colors hover:border-psg-red">
            {t("signIn")}
          </Link>
        </div>
      </div>
      <Link href="/watch-parties" className="inline-flex items-center gap-1.5 self-start border-b border-psg-red pb-0.5 text-[14px] font-semibold">
        {t("all")}
        <ArrowRight className="size-3.5" aria-hidden />
      </Link>
    </article>
  );
}
