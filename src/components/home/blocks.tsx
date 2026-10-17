import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  CreditCard,
  Inbox,
  MapPin,
  MessageSquareReply,
  Newspaper,
  Target,
  Trophy,
  Vote,
  type LucideIcon,
} from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { EventParticipants } from "@/components/events/event-participants";
import { EventPreview } from "@/components/events/event-preview";
import { EventSignup } from "@/components/events/event-signup";
import { EventWhen } from "@/components/events/event-when";
import { Countdown } from "@/components/home/countdown";
import { LiveMatches } from "@/components/matches/live-matches";
import { PredictionCardBody, type Access } from "@/components/matches/prediction-card";
import { Scoreboard } from "@/components/matches/scoreboard";
import { LockedCard } from "@/components/membership/locked-card";
import { NewsCard } from "@/components/news/news-cards";
import { UserAvatar } from "@/components/user-avatar";
import { Link } from "@/i18n/navigation";
import type { EventAccess } from "@/lib/dues";
import type { homeBasics, homeMemberExtras } from "@/lib/home";
import type { Match } from "@/lib/matches";
import { formatChf } from "@/lib/money";
import type { Post } from "@/lib/news";
import type { NotificationItem } from "@/lib/notification-feed";
import { seasonRates } from "@/lib/payments/dues-price";
import { cn } from "@/lib/utils";

/*
 * The pieces the home page variants are built from. Each one has its own empty state, so a
 * variant always looks finished, whatever the club has on.
 */

export type Basics = Awaited<ReturnType<typeof homeBasics>>;
export type Extras = NonNullable<Awaited<ReturnType<typeof homeMemberExtras>>>;

export const card = "rounded-[16px] border bg-card shadow-brand";
export const eyebrow = "font-wide text-[10px] font-semibold tracking-[0.1em] text-muted-foreground uppercase";
export const display = "font-narrow leading-[0.9] font-extrabold uppercase italic";
export const primaryButton =
  "inline-flex h-12 items-center justify-center gap-2 rounded-[10px] bg-segment px-6 font-wide text-[12px] font-semibold tracking-[0.06em] text-segment-foreground uppercase shadow-brand [transition:opacity_.2s,transform_.15s] hover:opacity-90 active:scale-[0.98]";
const quietLink = "inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground";

/** Section title with a "see all" link on the right. */
export function BlockTitle({ title, href, more }: { title: string; href?: string; more?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className={eyebrow}>{title}</h2>
      {href && more ? (
        <Link href={href} className={quietLink}>
          {more}
          <ArrowRight className="size-3" aria-hidden />
        </Link>
      ) : null}
    </div>
  );
}

/** Access to predictions: accepted members predict, others see the locked card. */
export const predictionAccess = (viewer: { access: EventAccess }): Access =>
  viewer.access === "guest" ? "guest" : viewer.access === "pending" ? "inactive" : "member";

/**
 * The match that matters now: live (score refreshing), or the next one with its countdown, or
 * the last result. `big`: the top of the page.
 */
export async function MatchStage({ basics, big = false }: { basics: Basics; big?: boolean }) {
  const t = await getTranslations("Home");
  const { live, focus } = basics;
  if (live.length) {
    return (
      <section className="space-y-3">
        <p className={cn(eyebrow, "flex items-center gap-2 text-psg-red")}>
          <span aria-hidden className="size-2 animate-pulse rounded-full bg-psg-red" />
          {t("live")}
        </p>
        <LiveMatches initial={live} />
      </section>
    );
  }
  if (!focus) {
    return (
      <section className={cn(card, "grid place-items-center gap-2 px-6 py-12 text-center")}>
        <Trophy className="size-6 text-muted-foreground" aria-hidden />
        <p className="text-[15px] text-muted-foreground">{t("noMatch")}</p>
      </section>
    );
  }
  const upcoming = focus.status === "scheduled";
  return (
    <section className="space-y-3">
      <BlockTitle title={upcoming ? t("nextMatch") : t("lastResult")} href="/matches" more={t("allMatches")} />
      <Link href={`/matches/${focus.id}`} className="block transition-opacity hover:opacity-95">
        <Scoreboard match={focus} />
      </Link>
      {upcoming ? <Countdown to={focus.kickoffAt.toISOString()} className={cn("pt-1", big ? "py-3" : "")} /> : null}
    </section>
  );
}

/** How the club sees the match: win / draw / loss shares of the members' predictions. */
export async function CommunitySplit({ stats, locked = false }: { stats: Basics["stats"]; locked?: boolean }) {
  const t = await getTranslations("Home");
  if (!stats || stats.total === 0) return null;
  const share = (value: number) => Math.round((value / stats.total) * 100);
  return (
    <div className="space-y-2.5">
      <p className="text-[15px] leading-snug">
        {t.rich("communityLead", { percent: share(stats.win), count: stats.total, strong: (chunks) => <strong className="font-semibold">{chunks}</strong> })}
      </p>
      <div className={cn("flex h-2.5 overflow-hidden rounded-full bg-foreground/10", locked && "opacity-70")}>
        <span className="bg-ok" style={{ width: `${share(stats.win)}%` }} />
        <span className="bg-foreground/40" style={{ width: `${share(stats.draw)}%` }} />
        <span className="bg-psg-red" style={{ width: `${share(stats.loss)}%` }} />
      </div>
      <p className="flex justify-between text-[12px] text-muted-foreground">
        <span>{t("win", { percent: share(stats.win) })}</span>
        <span>{t("draw", { percent: share(stats.draw) })}</span>
        <span>{t("loss", { percent: share(stats.loss) })}</span>
      </p>
    </div>
  );
}

/** Predict the next match without leaving the page (members), or the locked card (others). */
export async function PredictBlock({ match, access, memberId, framed = true }: { match: Match | null; access: Access; memberId: string | null; framed?: boolean }) {
  const t = await getTranslations("Home");
  if (!match) return null;
  return (
    <section className="space-y-3">
      <BlockTitle title={t("predictTitle")} href="/matches/leaderboard" more={t("leaderboard")} />
      <PredictionCardBody match={match} access={access} memberId={memberId} bare={!framed} />
    </section>
  );
}

/** The next club event: who comes, places left, sign-up in one tap — or its locked preview. */
export async function EventBlock({ event, participants, access, memberId, title }: { event: Basics["event"]; participants: Basics["participants"]; access: EventAccess; memberId: string | null; title?: string }) {
  const [t, tEvents] = await Promise.all([getTranslations("Home"), getTranslations("Events")]);
  if (access !== "full") {
    return (
      <section className="space-y-3">
        <BlockTitle title={title ?? t("nextEvent")} />
        <LockedCard access={access} feature="events" next={event ? `/events/${event.id}` : "/events"} preview={<EventPreview opponent={event?.match?.opponent} />} />
      </section>
    );
  }
  if (!event) {
    return (
      <section className="space-y-3">
        <BlockTitle title={title ?? t("nextEvent")} href="/events" more={t("allEvents")} />
        <div className={cn(card, "grid place-items-center gap-2 px-6 py-10 text-center")}>
          <CalendarDays className="size-6 text-muted-foreground" aria-hidden />
          <p className="text-[15px] text-muted-foreground">{t("noEvent")}</p>
        </div>
      </section>
    );
  }
  const full = event.capacity !== null && event.registered >= event.capacity;
  const left = event.capacity === null ? null : Math.max(0, event.capacity - event.registered);
  return (
    <section className="space-y-3">
      <BlockTitle title={title ?? t("nextEvent")} href="/events" more={t("allEvents")} />
      <article className={cn(card, "flex flex-col gap-4 p-5")}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex h-[22px] items-center rounded-full bg-psg-red px-[9px] font-wide text-[9px] font-semibold tracking-[0.08em] text-white uppercase">
            {tEvents(`types.${event.type}`)}
          </span>
          {left !== null ? <span className="text-[12px] text-muted-foreground">{full ? tEvents("full") : tEvents("placesLeft", { count: left })}</span> : null}
        </div>
        <Link href={`/events/${event.id}`} className="group space-y-1.5">
          <h3 className={cn(display, "text-[length:clamp(26px,4vw,34px)] group-hover:opacity-80")}>{event.title}</h3>
          <p className="text-[14px] text-muted-foreground">
            <EventWhen startsAt={event.startsAt} endsAt={event.endsAt} />
          </p>
          {event.location ? (
            <p className="flex items-start gap-1.5 text-[14px] text-muted-foreground">
              <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              {event.location}
            </p>
          ) : null}
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          {participants.length ? <EventParticipants participants={participants} me={memberId} /> : <span className="text-[13px] text-muted-foreground">{t("beFirst")}</span>}
          <EventSignup eventId={event.id} status={event.myStatus} full={full} access="member" />
        </div>
      </article>
    </section>
  );
}

/** A few articles in a grid (the latest first). */
export async function NewsStrip({ posts, count = 3, title }: { posts: Post[]; count?: number; title?: string }) {
  const t = await getTranslations("Home");
  const list = posts.slice(0, count);
  return (
    <section className="space-y-4">
      <BlockTitle title={title ?? t("latestNews")} href="/news" more={t("allNews")} />
      {list.length ? (
        <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((post) => (
            <NewsCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <p className="rounded-[12px] border border-dashed px-4 py-10 text-center text-[14px] text-muted-foreground">{t("noNews")}</p>
      )}
    </section>
  );
}

const KIND_ICONS: Record<NotificationItem["kind"], LucideIcon> = {
  article: Newspaper,
  event: CalendarDays,
  prediction: Target,
  points: Trophy,
  membership: BadgeCheck,
  contactInbox: Inbox,
  contactReply: MessageSquareReply,
};

/** The text of a feed item, as the bell writes it. */
async function feedText(item: NotificationItem) {
  const t = await getTranslations("Notifications");
  switch (item.kind) {
    case "article":
    case "event":
      return { label: t(`kinds.${item.kind}`), body: item.title };
    case "prediction":
      return { label: t("kinds.prediction"), body: t("predictionBody", { opponent: item.opponent }) };
    case "points":
      return { label: t("kinds.points"), body: t("pointsBody", { count: item.points, opponent: item.opponent }) };
    case "membership":
      return { label: t("kinds.membership"), body: t("membershipBody") };
    case "contactInbox":
      return { label: t("kinds.contactInbox"), body: t("contactInboxBody", { count: item.count }) };
    case "contactReply":
      return { label: t("kinds.contactReply"), body: t("contactReplyBody", { reference: item.reference }) };
  }
}

/** "Since your last visit": one chip per kind of news (2 articles, +3 points…), each a link. */
export async function SinceLastVisit({ extras }: { extras: Extras }) {
  const t = await getTranslations("Home");
  const unread = extras.unread;
  if (unread.length === 0) return <p className="text-[15px] text-muted-foreground">{t("upToDate")}</p>;
  const groups = new Map<NotificationItem["kind"], (typeof unread)[number][]>();
  for (const item of unread) groups.set(item.kind, [...(groups.get(item.kind) ?? []), item]);
  const points = unread.reduce((sum, item) => sum + (item.kind === "points" ? item.points : 0), 0);
  return (
    <div className="space-y-2.5">
      <p className={eyebrow}>{t("sinceLastVisit")}</p>
      <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
        {[...groups].map(([kind, items]) => {
          const Icon = KIND_ICONS[kind];
          return (
            <li key={kind} className="shrink-0">
              <Link href={items[0]!.href} className="inline-flex h-10 items-center gap-2 rounded-full border bg-card px-3.5 text-[13px] font-semibold whitespace-nowrap transition-colors hover:border-foreground/30">
                <span aria-hidden className="size-1.5 rounded-full bg-psg-red" />
                <Icon className="size-3.5 text-muted-foreground" aria-hidden />
                {kind === "points" ? t("chips.points", { count: points }) : t(`chips.${kind}`, { count: items.length })}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** My place in the season's table, the podium beside it. */
export async function RankBlock({ extras, compact = false }: { extras: Extras; compact?: boolean }) {
  const t = await getTranslations("Home");
  const { me, top, total } = extras.board;
  return (
    <section className="space-y-3">
      <BlockTitle title={t("rankTitle")} href="/matches/leaderboard" more={t("leaderboard")} />
      <div className={cn(card, "flex flex-col gap-4 p-5")}>
        {me ? (
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className={cn(display, "text-[56px] tabular-nums")}>
                {me.rank}
                <span className="text-[22px] text-muted-foreground"> / {total}</span>
              </p>
              <p className="text-[13px] text-muted-foreground">{t("rankPoints", { points: me.points, exact: me.exact })}</p>
            </div>
            <Trophy className="mb-2 size-7 text-psg-red" aria-hidden />
          </div>
        ) : (
          <p className="text-[14px] text-pretty text-muted-foreground">{t("rankEmpty")}</p>
        )}
        {!compact && top.length ? (
          <ol className="flex flex-col gap-2 border-t pt-4">
            {top.map((row) => (
              <li key={row.memberId} className="flex items-center gap-3 text-[14px]">
                <span className="w-4 text-center font-semibold tabular-nums">{row.rank}</span>
                <UserAvatar name={row.name} email={row.email} image={row.image} className="size-7 text-[10px]" />
                <span className="min-w-0 flex-1 truncate">{row.name}</span>
                <span className="tabular-nums text-muted-foreground">{t("pts", { points: row.points })}</span>
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    </section>
  );
}

const TODO_ICONS = { predict: Target, dues: CreditCard, signUp: CalendarDays, vote: Vote } as const;

/** What is left to do, most useful first; each line goes straight to it. */
export async function TodoList({ extras }: { extras: Extras }) {
  const t = await getTranslations("Home");
  if (extras.todo.length === 0) {
    return (
      <div className={cn(card, "flex items-center gap-3 p-4")}>
        <span className="grid size-9 place-items-center rounded-full bg-ok/15 text-ok">
          <BadgeCheck className="size-4" aria-hidden />
        </span>
        <p className="text-[14px] font-semibold">{t("todo.done")}</p>
      </div>
    );
  }
  return (
    <section className={cn(card, "overflow-hidden")}>
      <p className={cn(eyebrow, "px-4 pt-4 pb-2")}>{t("todo.title", { count: extras.todo.length })}</p>
      <ul className="divide-y">
        {extras.todo.map((item) => {
          const Icon = TODO_ICONS[item.kind];
          const text =
            item.kind === "predict" ? t("todo.predict", { opponent: item.opponent }) : item.kind === "dues" ? t("todo.dues") : item.kind === "signUp" ? t("todo.signUp", { title: item.title }) : t("todo.vote", { title: item.title });
          return (
            <li key={`${item.kind}-${item.href}`}>
              <Link href={item.href} className="flex min-h-14 items-center gap-3 px-4 py-3 transition-colors hover:bg-foreground/[0.03]">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-psg-blue text-white dark:bg-white dark:text-psg-blue">
                  <Icon className="size-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1 text-[14px] leading-snug font-semibold text-pretty">{text}</span>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** The member's timeline: today, this week, earlier — each card with its action. */
export async function Feed({ extras }: { extras: Extras }) {
  const [t, format] = await Promise.all([getTranslations("Home"), getFormatter()]);
  const now = extras.at;
  const day = 24 * 60 * 60 * 1000;
  const buckets = [
    { key: "today", items: extras.feed.items.filter((item) => now - new Date(item.at).getTime() < day) },
    { key: "week", items: extras.feed.items.filter((item) => now - new Date(item.at).getTime() >= day && now - new Date(item.at).getTime() < 7 * day) },
    { key: "earlier", items: extras.feed.items.filter((item) => now - new Date(item.at).getTime() >= 7 * day) },
  ] as const;
  if (extras.feed.items.length === 0) return <p className="rounded-[12px] border border-dashed px-4 py-10 text-center text-[14px] text-muted-foreground">{t("feedEmpty")}</p>;
  return (
    <div className="flex flex-col gap-8">
      {await Promise.all(
        buckets
          .filter((bucket) => bucket.items.length)
          .map(async (bucket) => (
            <section key={bucket.key} className="space-y-3">
              <h2 className={eyebrow}>{t(`buckets.${bucket.key}`)}</h2>
              <ul className="flex flex-col gap-2">
                {await Promise.all(
                  bucket.items.map(async (item) => {
                    const Icon = KIND_ICONS[item.kind];
                    const { label, body } = await feedText(item);
                    return (
                      <li key={item.id}>
                        <Link href={item.href} className={cn(card, "flex items-start gap-3.5 p-4 shadow-none transition-colors hover:border-foreground/25")}>
                          <span className={cn("grid size-10 shrink-0 place-items-center rounded-full", item.unread ? "bg-psg-blue text-white dark:bg-white dark:text-psg-blue" : "bg-foreground/5 text-muted-foreground")}>
                            <Icon className="size-4" aria-hidden />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-baseline justify-between gap-2 text-[12px] text-muted-foreground">
                              <span className="truncate">{label}</span>
                              <time dateTime={item.at} className="shrink-0" suppressHydrationWarning>
                                {format.relativeTime(new Date(item.at), now)}
                              </time>
                            </span>
                            <span className={cn("mt-0.5 block text-[15px] leading-snug text-pretty", item.unread ? "font-semibold" : "text-foreground/85")}>{body}</span>
                            <span className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-psg-blue dark:text-foreground">
                              {t(`actions.${item.kind}`)}
                              <ArrowRight className="size-3" aria-hidden />
                            </span>
                          </span>
                          {item.unread ? <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-psg-red" /> : null}
                        </Link>
                      </li>
                    );
                  }),
                )}
              </ul>
            </section>
          )),
      )}
    </div>
  );
}

/** "Join the club": the season's fee and what it opens, with the way in. */
export async function JoinBand({ compact = false }: { compact?: boolean }) {
  const [t, rates] = await Promise.all([getTranslations("Home"), seasonRates()]);
  if (compact) {
    return (
      <aside className="flex flex-col gap-3 rounded-[16px] bg-psg-blue p-5 text-white shadow-brand [background-image:repeating-linear-gradient(135deg,rgb(255_255_255/0.07)_0_1px,transparent_1px_14px)]">
        <p className={cn(display, "text-[28px]")}>{t("join.title")}</p>
        <p className="text-[14px] leading-snug text-white/80">{t("join.short", { fee: formatChf(rates.adult) })}</p>
        <Link href="/join" className="inline-flex h-11 items-center justify-center gap-2 rounded-[10px] bg-white font-wide text-[11px] font-semibold tracking-[0.06em] text-psg-blue uppercase transition-opacity hover:opacity-90">
          {t("join.cta")}
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </aside>
    );
  }
  return (
    <section className="relative isolate overflow-hidden rounded-[20px] bg-psg-blue px-[clamp(20px,5vw,56px)] py-[clamp(32px,6vw,64px)] text-white shadow-brand [background-image:repeating-linear-gradient(135deg,rgb(255_255_255/0.07)_0_1px,transparent_1px_14px)]">
      {/* The shirt's band on the right edge. */}
      <span aria-hidden className="absolute inset-y-0 right-[8%] -z-10 w-[clamp(28px,5vw,56px)] border-x-[6px] border-white bg-psg-red" />
      <div className="max-w-[34rem] space-y-4">
        <p className="font-wide text-[10px] font-semibold tracking-[0.1em] text-white/70 uppercase">{t("join.eyebrow", { season: rates.season })}</p>
        <h2 className={cn(display, "text-[length:clamp(40px,8vw,72px)]")}>{t("join.title")}</h2>
        <ul className="space-y-1.5 text-[15px] text-white/85">
          {(["perkEvents", "perkPredictions", "perkCard", "perkShop"] as const).map((key) => (
            <li key={key} className="flex items-start gap-2">
              <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-psg-red ring-2 ring-white/60" />
              {t(`join.${key}`)}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center gap-4 pt-2">
          <Link href="/join" className="inline-flex h-12 items-center gap-2 rounded-[10px] bg-white px-6 font-wide text-[12px] font-semibold tracking-[0.06em] text-psg-blue uppercase transition-opacity hover:opacity-90">
            {t("join.cta")}
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
          <span className="text-[14px] text-white/80">{t("join.fee", { fee: formatChf(rates.adult) })}</span>
        </div>
      </div>
    </section>
  );
}

/** Three figures that say the club is alive. */
export async function ClubFigures({ figures }: { figures: { members: number; events: number; predictions: number } }) {
  const t = await getTranslations("Home");
  const items = [
    { value: figures.members, label: t("figures.members") },
    { value: figures.events, label: t("figures.events") },
    { value: figures.predictions, label: t("figures.predictions") },
  ];
  return (
    <dl className="grid grid-cols-3 gap-3 border-y py-6">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col items-center gap-1 text-center">
          <dd className={cn(display, "text-[length:clamp(36px,8vw,64px)] tabular-nums")}>{item.value}</dd>
          <dt className="text-[12px] leading-tight text-muted-foreground">{item.label}</dt>
        </div>
      ))}
    </dl>
  );
}

/** The greeting at the top of the member home. */
export async function Greeting({ name, children }: { name: string; children?: React.ReactNode }) {
  const t = await getTranslations("Home");
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Zurich", hour: "numeric", hour12: false }).format(new Date()));
  const greet = hour < 5 || hour >= 18 ? t("greetEvening", { name }) : hour < 12 ? t("greetMorning", { name }) : t("greetDay", { name });
  return (
    <header className="flex flex-col gap-4">
      <h1 className={cn(display, "text-[length:clamp(40px,8vw,76px)] break-words")}>{greet}</h1>
      {children}
    </header>
  );
}
