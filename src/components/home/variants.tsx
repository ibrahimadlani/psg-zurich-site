import { ArrowRight } from "lucide-react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { ContactFaq } from "@/components/contact/contact-faq";
import { AwayTripIllustration, MembersMatchIllustration, SocialIllustration, WatchPartyIllustration } from "@/components/events/event-illustrations";
import {
  type Basics,
  BlockTitle,
  ClubFigures,
  CommunitySplit,
  EventBlock,
  type Extras,
  Feed,
  Greeting,
  JoinBand,
  MatchStage,
  NewsStrip,
  PredictBlock,
  RankBlock,
  SinceLastVisit,
  TodoList,
  card,
  display,
  eyebrow,
  predictionAccess,
} from "@/components/home/blocks";
import { MatchMiniCard } from "@/components/matches/match-mini-card";
import { FeaturedNews, NewsCard } from "@/components/news/news-cards";
import { Link } from "@/i18n/navigation";
import type { HomeViewer } from "@/lib/home";
import { cn } from "@/lib/utils";

type VisitorProps = { basics: Basics; viewer: HomeViewer };
type MemberProps = { basics: Basics; viewer: HomeViewer; extras: Extras };

/* Visitors ------------------------------------------------------------------- */

/** V1 "Matchday": the show first (the next match, its countdown, what the club thinks), then the way in. */
export async function VisitorMatchday({ basics, viewer }: VisitorProps) {
  const t = await getTranslations("Home");
  return (
    <div className="flex flex-col gap-[clamp(40px,7vw,72px)]">
      <section className="flex flex-col gap-6">
        <div className="space-y-3 text-center">
          <p className={eyebrow}>{t("v1.eyebrow")}</p>
          <h1 className={cn(display, "mx-auto max-w-[14ch] text-[length:clamp(48px,11vw,104px)] text-balance")}>{t("v1.title")}</h1>
        </div>
        <MatchStage basics={basics} big />
        {basics.stats?.total ? (
          <div className={cn(card, "mx-auto flex w-full max-w-xl flex-col gap-4 p-5")}>
            <CommunitySplit stats={basics.stats} locked />
            <Link href="/join" className="inline-flex items-center gap-1.5 self-start border-b border-psg-red pb-0.5 text-[14px] font-semibold">
              {t("v1.predictWithUs")}
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>
        ) : null}
      </section>
      <EventBlock event={basics.matchEvent ?? basics.event} participants={[]} access={viewer.access} memberId={null} title={t("v1.watchTogether")} />
      <NewsStrip posts={basics.news} />
      <JoinBand />
    </div>
  );
}

/** V2 "Journal": editorial — the lead story, the articles, the match and the club on the side. */
export async function VisitorJournal({ basics, viewer }: VisitorProps) {
  const t = await getTranslations("Home");
  const [lead, ...rest] = basics.news;
  return (
    <div className="flex flex-col gap-8">
      <header className="space-y-2">
        <p className={eyebrow}>{t("v2.eyebrow")}</p>
        <h1 className={cn(display, "text-[length:clamp(44px,9vw,88px)]")}>{t("v2.title")}</h1>
      </header>
      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="flex min-w-0 flex-col gap-10">
          {lead ? <FeaturedNews post={lead} /> : <p className="text-muted-foreground">{t("noNews")}</p>}
          <div className="grid gap-x-5 gap-y-10 sm:grid-cols-2">
            {rest.slice(0, 2).map((post) => (
              <NewsCard key={post.id} post={post} />
            ))}
          </div>
          {rest.length > 2 ? <JoinBand /> : null}
          <div className="grid gap-x-5 gap-y-10 sm:grid-cols-2">
            {rest.slice(2, 8).map((post) => (
              <NewsCard key={post.id} post={post} />
            ))}
          </div>
          <Link href="/news" className="inline-flex items-center gap-1.5 self-center border-b pb-0.5 text-[14px] font-semibold">
            {t("allNews")}
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </div>
        <aside className="flex flex-col gap-6 lg:sticky lg:top-6">
          {basics.focus ? (
            <section className="space-y-3">
              <BlockTitle title={basics.focus.status === "live" ? t("live") : basics.focus.status === "scheduled" ? t("nextMatch") : t("lastResult")} href="/matches" more={t("allMatches")} />
              <MatchMiniCard match={basics.focus} />
            </section>
          ) : null}
          <EventBlock event={basics.event} participants={[]} access={viewer.access} memberId={null} />
          {rest.length > 2 ? null : <JoinBand compact />}
        </aside>
      </div>
    </div>
  );
}

/** V3 "Club": belonging — the manifesto, the figures, what being a member means, then the way in. */
export async function VisitorClub({ basics, figures }: VisitorProps & { figures: { members: number; events: number; predictions: number } }) {
  const t = await getTranslations("Home");
  const perks = [
    { key: "watch", Illustration: WatchPartyIllustration, href: "/events" },
    { key: "travel", Illustration: AwayTripIllustration, href: "/events" },
    { key: "play", Illustration: MembersMatchIllustration, href: "/events" },
    { key: "together", Illustration: SocialIllustration, href: "/join" },
  ] as const;
  return (
    <div className="flex flex-col gap-[clamp(48px,8vw,88px)]">
      <section className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <p className={eyebrow}>{t("v3.eyebrow")}</p>
          <h1 className={cn(display, "text-[length:clamp(52px,12vw,120px)]")}>{t("v3.title")}</h1>
          <p className="max-w-[34rem] text-[17px] leading-relaxed text-pretty text-muted-foreground">{t("v3.body")}</p>
          <Link href="/join" className="inline-flex h-12 items-center gap-2 rounded-[10px] bg-segment px-6 font-wide text-[12px] font-semibold tracking-[0.06em] text-segment-foreground uppercase shadow-brand transition-opacity hover:opacity-90">
            {t("join.cta")}
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </div>
        <div className="relative mx-auto grid aspect-square w-full max-w-[22rem] place-items-center">
          <span aria-hidden className="absolute inset-[8%] rounded-full bg-psg-blue/10 blur-2xl dark:bg-psg-blue/30" />
          <Image src="/brand/psg-crest.svg" alt="" width={320} height={320} priority className="relative size-[78%] drop-shadow-[0_24px_48px_rgb(0_0_0/0.25)]" />
        </div>
      </section>
      <ClubFigures figures={figures} />
      <section className="space-y-5">
        <h2 className={cn(display, "text-[length:clamp(36px,6vw,56px)]")}>{t("v3.perksTitle")}</h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {perks.map(({ key, Illustration, href }) => (
            <li key={key}>
              <Link href={href} className={cn(card, "group flex h-full flex-col overflow-hidden")}>
                <div className="aspect-[8/5] overflow-hidden">
                  <div className="size-full transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none">
                    <Illustration label={t(`v3.perks.${key}.title`)} />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 p-5">
                  <h3 className={cn(display, "text-[26px]")}>{t(`v3.perks.${key}.title`)}</h3>
                  <p className="text-[15px] leading-normal text-pretty text-muted-foreground">{t(`v3.perks.${key}.body`)}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        {basics.news[0] ? (
          <section className="space-y-4">
            <BlockTitle title={t("latestNews")} href="/news" more={t("allNews")} />
            <FeaturedNews post={basics.news[0]} />
          </section>
        ) : null}
        {basics.focus ? (
          <section className="space-y-3">
            <BlockTitle title={basics.focus.status === "live" ? t("live") : basics.focus.status === "scheduled" ? t("nextMatch") : t("lastResult")} href="/matches" more={t("allMatches")} />
            <MatchMiniCard match={basics.focus} />
          </section>
        ) : null}
      </div>
      <section className="space-y-4">
        <h2 className={cn(display, "text-[length:clamp(32px,5vw,48px)]")}>{t("v3.faqTitle")}</h2>
        <ContactFaq />
      </section>
      <JoinBand />
    </div>
  );
}

/* Members --------------------------------------------------------------------- */

const firstName = (viewer: HomeViewer) => viewer.member?.firstName ?? viewer.session?.user.name?.split(" ")[0] ?? "";

/** M1 "Dashboard": everything at a glance — news since last time, predict, sign up, rank, read. */
export async function MemberDashboard({ basics, viewer, extras }: MemberProps) {
  return (
    <div className="flex flex-col gap-[clamp(32px,5vw,48px)]">
      <Greeting name={firstName(viewer)}>
        <SinceLastVisit extras={extras} />
      </Greeting>
      {/* Two columns on a computer; on a phone one, in the order that matters: the match, then
          its prediction, then the event, the rank, the to-dos. */}
      <div className="flex flex-col gap-[clamp(24px,4vw,36px)] lg:grid lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
        <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-9">
          <div className="order-1 min-w-0">
            <MatchStage basics={basics} />
          </div>
          <div className="order-3 min-w-0">
            <EventBlock event={basics.event} participants={basics.participants} access={viewer.access} memberId={viewer.member?.id ?? null} />
          </div>
        </div>
        <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-9">
          <div className="order-2 min-w-0">
            <PredictBlock match={basics.next} access={predictionAccess(viewer)} memberId={viewer.member?.id ?? null} />
          </div>
          <div className="order-4 min-w-0">
            <RankBlock extras={extras} />
          </div>
          {extras.todo.length ? (
            <div className="order-5 min-w-0">
              <TodoList extras={extras} />
            </div>
          ) : null}
        </div>
      </div>
      <NewsStrip posts={basics.news} />
    </div>
  );
}

/** M2 "Feed": one column for the thumb — what is left to do, then everything new, newest first. */
export async function MemberFeed({ basics, viewer, extras }: MemberProps) {
  const t = await getTranslations("Home");
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <Greeting name={firstName(viewer)}>
        <p className="text-[15px] text-muted-foreground">{extras.unread.length ? t("feedLead", { count: extras.unread.length }) : t("upToDate")}</p>
      </Greeting>
      <TodoList extras={extras} />
      {basics.live.length || basics.next ? <MatchStage basics={basics} /> : null}
      <Feed extras={extras} />
      <NewsStrip posts={basics.news} count={2} title={t("toRead")} />
    </div>
  );
}

/** M3 "Matchday": the match at the centre — predict it, see the club's split, watch it together. */
export async function MemberMatchday({ basics, viewer, extras }: MemberProps) {
  const t = await getTranslations("Home");
  const memberId = viewer.member?.id ?? null;
  return (
    <div className="flex flex-col gap-[clamp(32px,6vw,56px)]">
      <section className="flex flex-col gap-5">
        <p className={cn(eyebrow, "text-center")}>{t("greetShort", { name: firstName(viewer) })}</p>
        <MatchStage basics={basics} big />
        <div className="grid items-start gap-5 lg:grid-cols-2">
          <PredictBlock match={basics.next} access={predictionAccess(viewer)} memberId={memberId} />
          <div className="flex flex-col gap-5">
            {basics.stats?.total ? (
              <section className="space-y-3">
                <BlockTitle title={t("communityTitle")} />
                <div className={cn(card, "p-5")}>
                  <CommunitySplit stats={basics.stats} />
                </div>
              </section>
            ) : null}
            <RankBlock extras={extras} compact />
          </div>
        </div>
      </section>
      <EventBlock
        event={basics.matchEvent ?? basics.event}
        participants={basics.matchEvent ? basics.matchParticipants : basics.participants}
        access={viewer.access}
        memberId={memberId}
        title={basics.matchEvent ? t("watchThisMatch") : undefined}
      />
      <NewsStrip posts={basics.news} />
    </div>
  );
}
