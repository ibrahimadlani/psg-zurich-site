import { useTranslations } from "next-intl";
import {
  AwayTripIllustration,
  MembersMatchIllustration,
  SocialIllustration,
  WatchPartyIllustration,
} from "@/components/events/event-illustrations";
import { Link } from "@/i18n/navigation";

const KINDS = [
  { type: "watch_party", Illustration: WatchPartyIllustration },
  { type: "away_trip", Illustration: AwayTripIllustration },
  { type: "members_match", Illustration: MembersMatchIllustration },
  { type: "social", Illustration: SocialIllustration },
] as const;

/**
 * /evenements for everyone who isn't an accepted member: what the club does, illustrated,
 * then a way in. The programme itself (dates, places, sign-ups) is for members only.
 */
export function EventsShowcase({ pending }: { pending: boolean }) {
  const t = useTranslations("EventsShowcase");
  const types = useTranslations("Events.types");

  return (
    <div className="flex flex-col gap-[clamp(32px,5vw,48px)]">
      <ul className="grid gap-[clamp(16px,2.5vw,24px)] sm:grid-cols-2">
        {KINDS.map(({ type, Illustration }) => (
          <li key={type} className="group flex flex-col overflow-hidden rounded-[14px] border bg-card shadow-brand">
            <div className="aspect-[8/5] overflow-hidden">
              <div className="size-full transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none">
                <Illustration label={types(type)} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5 p-[clamp(16px,2.5vw,22px)]">
              <h2 className="font-narrow text-[26px] leading-none font-extrabold uppercase italic">{types(type)}</h2>
              <p className="text-[15px] leading-normal text-pretty text-muted-foreground">{t(`kinds.${type}`)}</p>
            </div>
          </li>
        ))}
      </ul>

      <section className="flex flex-col items-center gap-4 rounded-[14px] border border-dashed px-6 py-[clamp(24px,4vw,36px)] text-center">
        <h2 className="font-wide text-xs font-semibold tracking-[0.08em] uppercase">{t("ctaTitle")}</h2>
        <p className="max-w-[30rem] text-[15px] leading-normal text-pretty text-muted-foreground">
          {pending ? t("pending") : t("ctaBody")}
        </p>
        {pending ? null : (
          <div className="flex flex-col items-center gap-3">
            <Link
              href="/adhesion"
              prefetch={false}
              className="inline-flex h-10 items-center justify-center rounded-[8px] bg-segment px-6 font-wide text-[11px] font-semibold tracking-[0.06em] text-segment-foreground uppercase shadow-brand transition-opacity hover:opacity-90"
            >
              {t("join")}
            </Link>
            <p className="text-[13px] text-muted-foreground">
              {t.rich("signIn", {
                link: (chunks) => (
                  <Link
                    href="/connexion?suite=%2Fevenements"
                    prefetch={false}
                    className="border-b pb-0.5 text-foreground transition-colors hover:border-brand-red"
                  >
                    {chunks}
                  </Link>
                ),
              })}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
