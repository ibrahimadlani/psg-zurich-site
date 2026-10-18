import { ArrowRight, Flame, HeartHandshake, Users } from "lucide-react";
import Image from "next/image";
import { getFormatter, getTranslations } from "next-intl/server";
import { ContactFaq } from "@/components/contact/contact-faq";
import { AwayTripIllustration, MembersMatchIllustration, SocialIllustration, WatchPartyIllustration } from "@/components/events/event-illustrations";
import { type Basics, EventBlock, MatchStage, NewsStrip, display, primaryButton } from "@/components/home/blocks";
import { CrestLake, HeroSkyline, StandArt } from "@/components/landing/illustrations";
import { TeamCrest } from "@/components/matches/team-crest";
import { CountUp, Parallax, Reveal, Tilt } from "@/components/landing/motion";
import { SeasonStory } from "@/components/landing/season-story";
import { Link } from "@/i18n/navigation";
import { currentSeason } from "@/lib/football/sync";
import { matchTitle } from "@/lib/matches";
import { formatChf } from "@/lib/money";
import { seasonRates } from "@/lib/payments/dues-price";
import { cn } from "@/lib/utils";

/** The site's diagonal lines, over the blue panels. */
const hatching = "[background-image:repeating-linear-gradient(135deg,rgb(255_255_255/0.07)_0_1px,transparent_1px_14px)]";
const container = "mx-auto w-full max-w-5xl px-4";
const kicker = "font-wide text-[11px] font-semibold tracking-[0.12em] text-psg-red uppercase";
const sectionTitle = cn(display, "text-[length:clamp(40px,7vw,76px)] text-balance leading-[0.9]");
const whiteButton =
  "inline-flex h-12 items-center justify-center gap-2 rounded-[10px] bg-white px-6 font-wide text-[12px] font-semibold tracking-[0.06em] text-psg-blue uppercase shadow-[0_10px_30px_-10px_rgb(0_0_0/0.5)] [transition:opacity_.2s,transform_.15s] hover:opacity-90 active:scale-[0.98]";
const ghostButton =
  "inline-flex h-12 items-center justify-center gap-2 rounded-[10px] px-5 font-wide text-[12px] font-semibold tracking-[0.06em] text-white uppercase ring-1 ring-white/30 transition-[background-color,transform] ring-inset hover:bg-white/10 active:scale-[0.98]";

/** Section heading: red kicker, big italic title, optional lead. */
function Heading({ kickerText, title, lead, center = false }: { kickerText: string; title: string; lead?: string; center?: boolean }) {
  return (
    <div className={cn("flex flex-col gap-4", center && "items-center text-center")}>
      <p className={cn(kicker, "reveal")}>{kickerText}</p>
      <h2 className={cn(sectionTitle, "reveal max-w-[16ch]")} style={{ "--i": 1 } as React.CSSProperties}>
        {title}
      </h2>
      {lead ? (
        <p className="reveal max-w-[36rem] text-[17px] leading-relaxed text-pretty text-muted-foreground" style={{ "--i": 2 } as React.CSSProperties}>
          {lead}
        </p>
      ) : null}
    </div>
  );
}

const delay = (index: number) => ({ "--i": index }) as React.CSSProperties;

/**
 * The visitors' home: who the club is and why join, told in one scroll — the night skyline,
 * the association and its values, the figures, a season with us, the next dates, how to join,
 * the news, the questions, and a last call.
 */
export async function VisitorLanding({ basics, figures }: { basics: Basics; figures: { members: number; events: number; predictions: number } }) {
  const [t, home, format, rates] = await Promise.all([getTranslations("Landing"), getTranslations("Home"), getFormatter(), seasonRates()]);
  const fee = formatChf(rates.adult);
  const season = currentSeason();
  const next = basics.next;
  const marquee = t.raw("marquee") as string[];

  const steps = [
    { key: "watch", href: "/events", Art: WatchPartyIllustration },
    { key: "travel", href: "/events", Art: AwayTripIllustration },
    { key: "play", href: "/matches", Art: MembersMatchIllustration },
    { key: "family", href: "/join", Art: SocialIllustration },
  ] as const;
  const values = [
    { key: "passion", Icon: Flame },
    { key: "respect", Icon: HeartHandshake },
    { key: "family", Icon: Users },
  ] as const;

  return (
    <div className="flex flex-col gap-[clamp(80px,12vw,140px)] overflow-x-clip pt-[clamp(12px,2.5vw,24px)] pb-[clamp(16px,3vw,32px)]">
      {/* 1. Hero ------------------------------------------------------------ */}
      <div className="flex flex-col">
        <section className={cn("relative isolate mx-2 overflow-hidden rounded-[24px] bg-psg-blue text-white shadow-brand sm:mx-4 sm:rounded-[32px]", hatching)}>
          <span aria-hidden className="absolute -top-1/3 right-[-10%] -z-10 size-[70vmax] rounded-full bg-[radial-gradient(closest-side,rgb(255_255_255/0.16),transparent)]" />
          <span aria-hidden className="absolute -bottom-1/2 -left-1/4 -z-10 size-[60vmax] rounded-full bg-[radial-gradient(closest-side,rgb(218_41_28/0.22),transparent)]" />
          <div className={cn(container, "grid items-end gap-4 pt-[clamp(32px,5vw,64px)] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-8")}>
            <div className="flex flex-col gap-6 lg:pb-[clamp(56px,6vw,80px)]">
              <p className="landing-rise inline-flex items-center gap-2 self-start rounded-full bg-white/10 py-1 pr-3.5 pl-1 font-wide text-[10px] font-semibold tracking-[0.1em] uppercase ring-1 ring-white/20 backdrop-blur ring-inset">
                <Image src="/brand/psg-crest.svg" alt="" width={22} height={22} priority className="size-[22px]" />
                {t("hero.eyebrow")}
              </p>
              <h1 className={cn(display, "text-[length:clamp(54px,8.2vw,104px)] leading-[0.9]")}>
                <span className="landing-rise block" style={delay(1)}>
                  {t("hero.title1")}
                </span>
                <span className="landing-rise block text-transparent [-webkit-text-stroke:2px_white]" style={delay(2)}>
                  {t("hero.title2")}
                </span>
              </h1>
              <p className="landing-rise max-w-[30rem] text-[17px] leading-relaxed text-pretty text-white/80 sm:text-[18px]" style={delay(3)}>
                {t("hero.lead")}
              </p>
              <div className="landing-rise flex flex-col gap-3 sm:flex-row sm:items-center" style={delay(4)}>
                <Link href="/join" className={whiteButton}>
                  {t("hero.join")}
                  <ArrowRight className="size-3.5" aria-hidden />
                </Link>
                <a href="#association" className={ghostButton}>
                  {t("hero.discover")}
                </a>
              </div>
              <p className="landing-rise flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-white/65" style={delay(5)}>
                <span>{t("hero.fee", { fee })}</span>
                <span aria-hidden className="size-1 rounded-full bg-white/40" />
                <span>{t("hero.pay")}</span>
              </p>
            </div>

            <div className="relative -mx-4 sm:mx-0">
              {next ? (
                <Link
                  href={`/matches/${next.id}`}
                  className="landing-float-chip absolute top-0 left-4 z-10 flex max-w-[calc(100%-2rem)] items-center gap-3 rounded-[14px] bg-white/10 py-2 pr-4 pl-2.5 ring-1 ring-white/25 backdrop-blur-md transition-colors ring-inset hover:bg-white/15 sm:left-0 lg:top-6"
                >
                  {/* Both crests, home team first, slightly overlapping. */}
                  <span aria-hidden className="flex shrink-0 items-center">
                    {(next.venue === "away"
                      ? [{ name: next.opponent, logo: next.opponentLogo }, { name: "PSG", logo: "/brand/psg-crest.svg" }]
                      : [{ name: "PSG", logo: "/brand/psg-crest.svg" }, { name: next.opponent, logo: next.opponentLogo }]
                    ).map((team, index) => (
                      <span key={team.name} className={cn("grid size-9 place-items-center rounded-full bg-white p-1 shadow-[0_2px_8px_rgb(0_0_0/0.25)] ring-2 ring-white/20", index && "-ml-2.5")}>
                        <TeamCrest name={team.name} logo={team.logo} className="size-full text-psg-blue" />
                      </span>
                    ))}
                  </span>
                  <span className="min-w-0 leading-tight">
                    <span className="block font-wide text-[9px] font-semibold tracking-[0.1em] text-white/70 uppercase">{t("hero.nextMatch")}</span>
                    <span className="block truncate text-[13px] font-semibold">{matchTitle(next, "PSG")}</span>
                    <span className="block text-[12px] text-white/70">
                      {format.dateTime(next.kickoffAt, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Zurich" })}
                    </span>
                  </span>
                </Link>
              ) : null}
              <Parallax className="landing-rise aspect-[600/520] w-full">
                <HeroSkyline label={t("hero.art")} />
              </Parallax>
            </div>
          </div>
          <a
            href="#association"
            aria-label={t("hero.scroll")}
            className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-1.5 font-wide text-[9px] font-semibold tracking-[0.14em] text-white/60 uppercase transition-colors hover:text-white lg:left-[max(1rem,calc(50%-32rem+1rem))] lg:flex lg:translate-x-0"
          >
            <span className="grid h-9 w-6 justify-center rounded-full pt-1.5 ring-1 ring-white/40 ring-inset">
              <span className="landing-scroll-cue block h-2 w-1 rounded-full bg-white" />
            </span>
          </a>
        </section>

        {/* 2. The band, like the shirt's ------------------------------------- */}
        <div aria-hidden className="relative -mt-5 overflow-hidden py-6">
          <div className="-mx-8 -rotate-[1.6deg] border-y-[5px] border-white bg-psg-red py-3 text-white shadow-brand dark:border-white/90">
            <div className="landing-marquee flex w-max">
              {[0, 1].map((copy) => (
                <ul key={copy} className="flex shrink-0 items-center">
                  {[...marquee, ...marquee].map((word, index) => (
                    <li key={index} className="flex items-center gap-6 pr-6 font-narrow text-[26px] leading-none font-extrabold whitespace-nowrap uppercase italic sm:text-[30px]">
                      {word}
                      <span className="size-2 rotate-45 bg-white" />
                    </li>
                  ))}
                </ul>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. The association ------------------------------------------------ */}
      <Reveal as="section" id="association" className={cn(container, "grid scroll-mt-24 items-center gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-16")}>
        <div className="flex flex-col gap-8">
          <Heading kickerText={t("about.eyebrow")} title={t("about.title")} />
          <div className="reveal flex flex-col gap-4 text-[17px] leading-relaxed text-pretty text-muted-foreground" style={delay(2)}>
            <p>{t("about.body1")}</p>
            <p>{t("about.body2")}</p>
          </div>
          <ul className="flex flex-col gap-2.5">
            {values.map(({ key, Icon }, index) => (
              <li key={key} className="reveal group flex items-center gap-4 rounded-[16px] border bg-card p-4 shadow-brand transition-transform duration-300 hover:-translate-y-0.5" style={delay(3 + index)}>
                <span className="grid size-11 shrink-0 place-items-center rounded-[12px] bg-psg-blue text-white transition-colors duration-300 group-hover:bg-psg-red dark:bg-white/10">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="flex flex-col gap-1">
                  <span className="font-narrow text-[22px] leading-none font-extrabold uppercase italic">{t(`about.values.${key}.title`)}</span>
                  <span className="text-[14px] leading-snug text-pretty text-muted-foreground">{t(`about.values.${key}.body`)}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="reveal relative" style={delay(2)}>
          <span aria-hidden className="absolute -inset-4 -z-10 rotate-3 rounded-[36px] bg-psg-red/10 dark:bg-psg-red/20" />
          <div className="overflow-hidden rounded-[28px] shadow-brand ring-1 ring-foreground/10">
            <CrestLake label={t("about.art")} />
          </div>
        </div>
      </Reveal>

      {/* 4. Figures --------------------------------------------------------- */}
      <Reveal as="section" className={container}>
        <div className="relative overflow-hidden rounded-[24px] border bg-card shadow-brand">
          <span aria-hidden className="bg-diagonal absolute inset-0 opacity-70" />
          <div className="relative flex flex-col gap-8 p-[clamp(24px,5vw,48px)]">
            <div className="flex flex-col gap-2">
              <p className={cn(kicker, "reveal")}>{t("figures.eyebrow")}</p>
              <h2 className={cn(display, "reveal text-[length:clamp(32px,5vw,52px)] leading-[0.9]")} style={delay(1)}>
                {t("figures.title")}
              </h2>
            </div>
            <dl className="grid gap-6 sm:grid-cols-3 sm:gap-0 sm:divide-x">
              {([
                ["members", figures.members],
                ["events", figures.events],
                ["predictions", figures.predictions],
              ] as const).map(([key, value], index) => (
                <div key={key} className="reveal flex flex-col gap-1 sm:px-6 sm:first:pl-0" style={delay(2 + index)}>
                  <dd className={cn(display, "text-[length:clamp(56px,9vw,96px)] text-psg-blue dark:text-white leading-[0.9]")}>
                    <CountUp value={value} />
                  </dd>
                  <dt className="text-[14px] text-muted-foreground">{home(`figures.${key}`)}</dt>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </Reveal>

      {/* 5. A season with us ----------------------------------------------- */}
      <Reveal as="section" className={cn(container, "flex flex-col gap-10 lg:gap-4")}>
        <Heading kickerText={t("season.eyebrow")} title={t("season.title")} lead={t("season.lead")} />
        <SeasonStory
          steps={steps.map(({ key, href, Art }) => ({
            key,
            href,
            title: t(`season.steps.${key}.title`),
            body: t(`season.steps.${key}.body`),
            cta: t(`season.steps.${key}.cta`),
            art: <Art label={t(`season.steps.${key}.title`)} />,
          }))}
        />
      </Reveal>

      {/* 6. The next dates -------------------------------------------------- */}
      <Reveal as="section" className={cn(container, "flex flex-col gap-10")}>
        <Heading kickerText={t("next.eyebrow")} title={t("next.title")} />
        <div className="reveal grid items-start gap-8 lg:grid-cols-2" style={delay(2)}>
          <MatchStage basics={basics} />
          <EventBlock event={basics.matchEvent ?? basics.event} participants={[]} access="guest" memberId={null} />
        </div>
      </Reveal>

      {/* 7. Join in three steps --------------------------------------------- */}
      <Reveal as="section" className={cn(container, "grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16")}>
        <div className="flex flex-col gap-8">
          <Heading kickerText={t("join.eyebrow")} title={t("join.title")} />
          <ol className="relative flex flex-col gap-6">
            <span aria-hidden className="absolute top-5 bottom-5 left-5 w-px bg-gradient-to-b from-psg-red via-foreground/20 to-transparent" />
            {(["account", "pay", "card"] as const).map((key, index) => (
              <li key={key} className="reveal relative flex gap-4" style={delay(2 + index)}>
                <span className="relative grid size-10 shrink-0 place-items-center rounded-full bg-background font-narrow text-[18px] font-extrabold italic ring-1 ring-foreground/15">
                  {index + 1}
                </span>
                <span className="flex flex-col gap-1 pt-1.5">
                  <span className="text-[17px] font-semibold">{t(`join.steps.${key}.title`)}</span>
                  <span className="text-[15px] leading-relaxed text-pretty text-muted-foreground">{t(`join.steps.${key}.body`, { fee })}</span>
                </span>
              </li>
            ))}
          </ol>
          <div className="reveal flex flex-wrap items-center gap-4" style={delay(5)}>
            <Link href="/join" className={primaryButton}>
              {t("join.cta")}
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
            <span className="text-[14px] text-muted-foreground">{t("hero.fee", { fee })}</span>
          </div>
        </div>

        {/* The member card, as members get it */}
        <div className="reveal mx-auto w-full max-w-[26rem] [perspective:1200px]" style={delay(2)}>
          <Tilt className="relative">
            <div className="landing-card relative aspect-[1.586] w-full overflow-hidden rounded-[18px] bg-psg-blue text-white shadow-[0_30px_60px_-20px_rgb(0_20_50/0.55)] [container-type:inline-size]">
              <span aria-hidden className="absolute inset-y-0 right-[8cqw] w-[5.5cqw] bg-psg-red/90" />
              <span aria-hidden className="absolute inset-y-0 right-[2.5cqw] w-[5.5cqw] bg-white/90" />
              <span aria-hidden className={cn("absolute inset-0", hatching)} />
              <span aria-hidden className="landing-card-glare absolute inset-0" />
              <div className="relative flex size-full flex-col justify-between p-[6cqw]">
                <div className="flex items-start justify-between gap-[3cqw]">
                  <div className="flex items-center gap-[2.8cqw]">
                    <Image src="/brand/psg-crest.svg" alt="" width={48} height={48} className="size-[11cqw]" />
                    <div className="leading-tight">
                      <p className="font-wide text-[2.4cqw] font-semibold tracking-[0.08em] uppercase opacity-80">{t("join.card.club")}</p>
                      <p className="text-[4.6cqw] font-semibold">PSG Zurich</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-psg-blue px-[2.6cqw] py-[1cqw] font-wide text-[2.2cqw] font-semibold tracking-[0.08em] uppercase ring-1 ring-white/25">{t("join.card.status")}</span>
                </div>
                <div className="space-y-[2.4cqw]">
                  <p className="font-narrow text-[8cqw] leading-none font-extrabold uppercase italic">{t("join.card.name")}</p>
                  <div className="flex gap-x-[5cqw]">
                    <div>
                      <p className="font-wide text-[2.1cqw] font-semibold tracking-[0.08em] uppercase opacity-70">{t("join.card.number")}</p>
                      <p className="font-mono text-[3.3cqw] font-semibold">0001</p>
                    </div>
                    <div>
                      <p className="font-wide text-[2.1cqw] font-semibold tracking-[0.08em] uppercase opacity-70">{t("join.card.season")}</p>
                      <p className="text-[3.3cqw] font-semibold">{`${season}/${String((season + 1) % 100).padStart(2, "0")}`}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Tilt>
          <span aria-hidden className="mx-auto mt-6 block h-4 w-3/4 rounded-[50%] bg-foreground/15 blur-md" />
        </div>
      </Reveal>

      {/* 8. News ----------------------------------------------------------- */}
      {basics.news.length ? (
        <Reveal as="section" className={container}>
          <div className="reveal">
            <NewsStrip posts={basics.news} />
          </div>
        </Reveal>
      ) : null}

      {/* 9. Questions ------------------------------------------------------- */}
      <Reveal as="section" className={cn(container, "grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16")}>
        <div className="flex flex-col gap-5 lg:sticky lg:top-24 lg:self-start">
          <Heading kickerText={t("faq.eyebrow")} title={t("faq.title")} lead={t("faq.body")} />
          <Link href="/contact" className="reveal inline-flex items-center gap-1.5 self-start border-b border-psg-red pb-0.5 text-[14px] font-semibold" style={delay(3)}>
            {t("faq.contact")}
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </div>
        <div className="reveal" style={delay(2)}>
          <ContactFaq />
        </div>
      </Reveal>

      {/* 10. Last call ------------------------------------------------------ */}
      <section className={cn("relative isolate mx-2 overflow-hidden rounded-[24px] bg-psg-blue text-white shadow-brand sm:mx-4 sm:rounded-[32px]", hatching)}>
        <span aria-hidden className="absolute inset-y-0 right-[9%] -z-10 w-[clamp(28px,5vw,56px)] border-x-[6px] border-white bg-psg-red" />
        <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-[clamp(150px,19vw,240px)]">
          <StandArt label="" />
        </div>
        <Reveal className={cn(container, "flex flex-col items-center gap-6 pt-[clamp(56px,9vw,112px)] pb-[clamp(200px,27vw,330px)] text-center")}>
          <h2 className={cn(display, "reveal max-w-[14ch] text-[length:clamp(52px,10vw,112px)] text-balance leading-[0.9]")}>{t("final.title")}</h2>
          <p className="reveal max-w-[32rem] text-[17px] leading-relaxed text-pretty text-white/80" style={delay(1)}>
            {t("final.body")}
          </p>
          <div className="reveal flex flex-col gap-3 sm:flex-row" style={delay(2)}>
            <Link href="/join" className={whiteButton}>
              {t("final.join")}
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
            <Link href="/events" className={ghostButton}>
              {t("final.events")}
            </Link>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
