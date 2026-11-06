import { ArrowRight } from "lucide-react";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { sectionTitle } from "@/components/matches/match-details";
import type { Locale } from "@/db/schema";
import { Link } from "@/i18n/navigation";
import { publicEventForMatch } from "@/lib/events";
import { TV_GUIDE } from "@/lib/match-seo";
import type { Match } from "@/lib/matches";
import { matchBroadcaster } from "@/lib/site-settings";

const label = "text-[12px] text-muted-foreground";
const value = "mt-0.5 text-[15px] font-semibold first-letter:uppercase";
const link = "inline-flex items-center gap-1.5 border-b pb-0.5 transition-colors hover:border-psg-red";

/**
 * Where to see a coming match from Switzerland: the Swiss kick-off, the channel once the
 * committee has checked it (nothing unchecked is ever announced), and where to go next.
 */
export async function MatchWatch({ match }: { match: Match }) {
  const t = await getTranslations("Matches.watch");
  const [format, locale, broadcaster, party] = await Promise.all([getFormatter(), getLocale(), matchBroadcaster(match), publicEventForMatch(match.id)]);
  return (
    <section aria-labelledby="watch-in-switzerland" className="rounded-[14px] border bg-card/70 p-5">
      <h2 id="watch-in-switzerland" className={sectionTitle}>
        {t("title")}
      </h2>
      <dl className="mt-3.5 grid gap-x-8 gap-y-3 sm:grid-cols-2">
        <div>
          <dt className={label}>{t("kickoff")}</dt>
          <dd className={value}>{format.dateTime(match.kickoffAt, { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}</dd>
        </div>
        <div>
          <dt className={label}>{t("channel")}</dt>
          <dd className={value}>{broadcaster ?? <span className="font-normal text-muted-foreground">{t("channelUnknown")}</span>}</dd>
        </div>
      </dl>
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2.5 border-t pt-3.5 text-[14px]">
        <Link href={party ? `/events/${party.id}` : "/watch-parties"} className={link}>
          {party ? t("party", { city: party.city }) : t("parties")}
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
        <Link href={`/news/${TV_GUIDE[locale as Locale]}`} className={link}>
          {t("guide")}
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
