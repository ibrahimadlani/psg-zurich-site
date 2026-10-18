import { ArrowRight, ArrowUpRight, Inbox, Mail, MapPin, MessagesSquare } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { CommitteeList } from "@/components/contact/committee-list";
import { ContactComposer } from "@/components/contact/contact-composer";
import { ContactFaq } from "@/components/contact/contact-faq";
import { CopyEmailButton } from "@/components/contact/copy-email-button";
import { InstagramIcon } from "@/components/instagram-icon";
import { LazyVisible } from "@/components/contact/lazy-visible";
import { MAPS_URL, ZurichMap } from "@/components/contact/zurich-map";
import { CONTACT_TOPICS, type ContactTopic } from "@/db/schema";
import { Link } from "@/i18n/navigation";
import { inboxCounts } from "@/lib/admin/messages-query";
import { committeeMembers, memberThreads, unreadThreadIds } from "@/lib/contact";
import { LEGAL } from "@/lib/legal";
import { INSTAGRAM } from "@/lib/social";
import { getCurrentMember } from "@/lib/members";
import { getSession } from "@/lib/permissions";
import { can } from "@/lib/roles";
import { ContactSkeleton } from "@/components/skeletons";
import { Streamed } from "@/components/ui/skeleton";

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const [t, session] = await Promise.all([getTranslations("Contact"), getSession()]);
  return { title: session ? t("supportTitle") : t("title"), description: t("intro") };
}

/** Topics on offer: visitors mostly join or propose; members ask about their membership. */
const VISITOR_TOPICS: ContactTopic[] = ["join", "partnership", "events", "website", "account", "other"];
const MEMBER_TOPICS: ContactTopic[] = ["events", "fees", "account", "website", "partnership", "other"];

/** French words accepted in ?sujet= links (footer, articles, QR codes), besides the topic keys. */
const TOPIC_ALIASES: Record<string, ContactTopic> = {
  adhesion: "join",
  evenements: "events",
  deplacements: "events",
  cotisation: "fees",
  partenariat: "partnership",
  presse: "partnership",
  site: "website",
  bug: "website",
  donnees: "account",
  autre: "other",
};

const asideTitle = "font-wide text-[11px] font-semibold tracking-[0.08em] uppercase";

async function ContactContent({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const [t, session, member, people, params] = await Promise.all([
    getTranslations("Contact"),
    getSession(),
    getCurrentMember(),
    committeeMembers(),
    searchParams,
  ]);
  const view = session && member ? "member" : "visitor";
  const topics = view === "member" ? MEMBER_TOPICS : VISITOR_TOPICS;
  const asked = typeof params.sujet === "string" ? params.sujet.toLowerCase() : "";
  const requested = (CONTACT_TOPICS as readonly string[]).includes(asked) ? (asked as ContactTopic) : TOPIC_ALIASES[asked];
  const initialTopic = requested && topics.includes(requested) ? requested : null;

  const [threads, unread, inbox] = await Promise.all([
    member ? memberThreads(member.id) : [],
    member ? unreadThreadIds(member.id) : new Set<string>(),
    session && can(session.user.role, "messages") ? inboxCounts(session.user.role) : null,
  ]);
  const open = threads.filter((thread) => thread.status !== "closed" && thread.status !== "spam").length;
  const email = LEGAL.email;

  return (
    <div className="flex flex-col gap-[clamp(28px,4vw,40px)]">
      <header className="flex flex-col gap-3.5">
        <h1 className="font-narrow text-[length:clamp(44px,9vw,88px)] leading-[0.88] font-extrabold tracking-[-0.01em] break-words uppercase italic">
          {view === "member" ? t("supportTitle") : t("title")}
        </h1>
        <p className="max-w-[36rem] text-base leading-normal text-pretty text-muted-foreground">{view === "member" ? t("memberIntro") : t("intro")}</p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-ok/12 px-3 text-[12px] font-semibold text-ok">
            <span aria-hidden className="size-1.5 rounded-full bg-ok" />
            {t("promise")}
          </span>
          {view === "member" ? (
            <Link
              href="/member/messages"
              prefetch={false}
              className="inline-flex h-7 items-center gap-1.5 rounded-full border bg-card px-3 text-[12px] transition-colors hover:border-foreground/30"
            >
              <MessagesSquare className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
              <span className="font-semibold">{t("myMessages")}</span>
              {/* New replies from the committee: a red count, like the bell. */}
              {unread.size ? (
                <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-psg-red px-1 text-[10px] leading-none font-bold text-white tabular-nums">
                  <span className="sr-only">{t("newReplies", { count: unread.size })}</span>
                  <span aria-hidden>{unread.size > 9 ? "9+" : unread.size}</span>
                </span>
              ) : open ? (
                <span className="text-muted-foreground">· {t("myMessagesOpen", { count: open })}</span>
              ) : null}
              <ArrowRight className="size-3 shrink-0 text-muted-foreground" aria-hidden />
            </Link>
          ) : null}
        </div>
      </header>

      {/* The committee: messages waiting, one tap to the inbox. */}
      {inbox?.toHandle ? (
        <Link
          href="/admin/messages"
          className="flex items-center gap-3 rounded-[14px] border border-psg-red/30 bg-psg-red/5 p-3.5 text-[14px] transition-colors hover:bg-psg-red/10"
        >
          <Inbox className="size-5 shrink-0 text-psg-red" aria-hidden />
          <span className="min-w-0 flex-1 font-semibold">{t("committeeBanner", { count: inbox.toHandle })}</span>
          <span className="hidden shrink-0 text-muted-foreground sm:inline">{t("committeeBannerLink")}</span>
          <ArrowRight className="size-4 shrink-0" aria-hidden />
        </Link>
      ) : null}

      <div className="grid items-start gap-[clamp(28px,4vw,40px)] lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-[clamp(28px,4vw,40px)]">
          <ContactComposer
            view={view}
            identity={view === "member" && member && session ? { name: `${member.firstName} ${member.lastName}`.trim(), email: session.user.email } : undefined}
            topics={topics}
            initialTopic={initialTopic}
          />

          <ContactFaq />
        </div>

        <aside className="flex min-w-0 flex-col gap-[clamp(24px,3vw,32px)] lg:sticky lg:top-6">
          {/* Title above the card, level with "You're writing about…" on the left. */}
          <section aria-labelledby="contact-email" className="flex flex-col gap-3">
            <h2 id="contact-email" className={asideTitle}>
              {t("byEmail")}
            </h2>
            {/* Same card as "Follow us": the whole card opens the mail app, the copy button sits on
                its right, outside the link. */}
            <div className="relative">
              <a
                href={`mailto:${email}`}
                className="group flex items-center gap-3 rounded-[14px] border bg-card p-4 pr-16 shadow-brand transition-colors hover:border-foreground/30"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-psg-blue text-white dark:bg-white dark:text-psg-blue">
                  <Mail className="size-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold">{email}</span>
                  <span className="block text-[13px] text-muted-foreground">{t("emailBody")}</span>
                </span>
              </a>
              <CopyEmailButton email={email} iconOnly className="absolute top-1/2 right-3 -translate-y-1/2" />
            </div>
          </section>

          <section aria-labelledby="contact-follow" className="flex flex-col gap-3">
            <h2 id="contact-follow" className={asideTitle}>
              {t("followTitle")}
            </h2>
            <a
              href={INSTAGRAM.url}
              target="_blank"
              rel="noreferrer"
              className="group flex items-center gap-3 rounded-[14px] border bg-card p-4 shadow-brand transition-colors hover:border-foreground/30"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-psg-blue text-white dark:bg-white dark:text-psg-blue">
                <InstagramIcon className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold">{INSTAGRAM.handle}</span>
                <span className="block text-[13px] text-muted-foreground">{t("followBody")}</span>
              </span>
              <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
            </a>
          </section>

          <CommitteeList people={people} />

          <section className="flex flex-col gap-3">
            <LazyVisible placeholder={<div className="aspect-[4/3] rounded-[14px] border bg-psg-blue/10 sm:aspect-[16/9] lg:aspect-[4/3]" />}>
              <ZurichMap label={t("mapLabel")} />
            </LazyVisible>
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-1 text-[14px]">
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="size-4" aria-hidden />
                {t("location")}
              </span>
              <a href={MAPS_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 border-b pb-0.5 text-[14px] transition-colors hover:border-brand-red">
                {t("openMap")}
                <ArrowUpRight className="size-3.5" aria-hidden />
              </a>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}


export default function ContactPage({ searchParams }: PageProps<"/[locale]/contact">) {
  return (
    <Streamed fallback={<ContactSkeleton />}>
      <ContactContent searchParams={searchParams} />
    </Streamed>
  );
}
