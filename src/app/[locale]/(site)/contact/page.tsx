import { ArrowRight, ArrowUpRight, CalendarCheck, CreditCard, IdCard, Inbox, Mail, MapPin, MessagesSquare, ShieldCheck, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { Suspense } from "react";
import { CommitteeList } from "@/components/contact/committee-list";
import { ContactComposer } from "@/components/contact/contact-composer";
import { ContactFaq } from "@/components/contact/contact-faq";
import { CopyEmailButton } from "@/components/contact/copy-email-button";
import { LazyVisible } from "@/components/contact/lazy-visible";
import { MAPS_URL, ZurichMap } from "@/components/contact/zurich-map";
import { CONTACT_TOPICS, type ContactTopic } from "@/db/schema";
import { Link } from "@/i18n/navigation";
import { inboxCounts } from "@/lib/admin/messages-query";
import { committeeMembers, memberThreads } from "@/lib/contact";
import { LEGAL } from "@/lib/legal";
import { getCurrentMember } from "@/lib/members";
import { getSession } from "@/lib/permissions";
import { can } from "@/lib/roles";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Contact");
  return { title: t("title"), description: t("intro") };
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

const SHORTCUTS: { key: "fee" | "card" | "events" | "data"; href: string; icon: LucideIcon }[] = [
  { key: "fee", href: "/cotisation", icon: CreditCard },
  { key: "card", href: "/espace-membre", icon: IdCard },
  { key: "events", href: "/evenements", icon: CalendarCheck },
  { key: "data", href: "/parametres/confidentialite", icon: ShieldCheck },
];

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

  const [threads, inbox] = await Promise.all([
    member ? memberThreads(member.id) : [],
    session && can(session.user.role, "messages") ? inboxCounts(session.user.role) : null,
  ]);
  const open = threads.filter((thread) => thread.status !== "closed" && thread.status !== "spam").length;
  const email = LEGAL.email;

  return (
    <div className="flex flex-col gap-[clamp(28px,4vw,40px)]">
      <header className="flex flex-col gap-3.5">
        <h1 className="font-narrow text-[length:clamp(44px,9vw,88px)] leading-[0.88] font-extrabold tracking-[-0.01em] break-words uppercase italic">
          {view === "member" && member ? t("hello", { name: member.firstName }) : t("title")}
        </h1>
        <p className="max-w-[36rem] text-base leading-normal text-pretty text-muted-foreground">{view === "member" ? t("memberIntro") : t("intro")}</p>
        <span className="inline-flex h-7 items-center gap-1.5 self-start rounded-full bg-ok/12 px-3 text-[12px] font-semibold text-ok">
          <span aria-hidden className="size-1.5 rounded-full bg-ok" />
          {t("promise")}
        </span>
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
          {view === "member" ? (
            <section aria-labelledby="contact-shortcuts" className="space-y-3">
              <h2 id="contact-shortcuts" className="sr-only">
                {t("shortcutsTitle")}
              </h2>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
                {SHORTCUTS.map(({ key, href, icon: Icon }) => (
                  <Link
                    key={key}
                    href={href}
                    prefetch={false}
                    className="flex min-h-14 items-center gap-2.5 rounded-[12px] border bg-card px-3 py-2.5 text-[14px] font-semibold transition-[border-color,transform] hover:border-foreground/30 active:scale-[0.98]"
                  >
                    <Icon className="size-4 shrink-0 text-psg-blue dark:text-foreground" aria-hidden />
                    <span className="min-w-0 leading-tight">{t(`shortcuts.${key}`)}</span>
                  </Link>
                ))}
              </div>
              <Link
                href="/espace-membre/messages"
                prefetch={false}
                className="flex min-h-14 items-center gap-3 rounded-[12px] border bg-card px-3.5 py-2.5 transition-colors hover:border-foreground/30"
              >
                <MessagesSquare className="size-5 shrink-0 text-psg-blue dark:text-foreground" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold">{t("myMessages")}</span>
                  <span className="block text-[12px] text-muted-foreground">{t("myMessagesOpen", { count: open })}</span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </section>
          ) : null}

          <ContactComposer
            view={view}
            identity={view === "member" && member && session ? { name: `${member.firstName} ${member.lastName}`.trim(), email: session.user.email } : undefined}
            topics={topics}
            initialTopic={initialTopic}
          />

          <ContactFaq />
        </div>

        <aside className="flex min-w-0 flex-col gap-[clamp(24px,3vw,32px)] lg:sticky lg:top-6">
          <section className="flex flex-col gap-3 rounded-[14px] border bg-card p-4 shadow-brand">
            <h2 className={asideTitle}>{t("byEmail")}</h2>
            <a href={`mailto:${email}`} className="inline-flex items-center gap-2 font-narrow text-[22px] leading-none font-extrabold break-all italic underline-offset-4 hover:underline">
              <Mail className="size-4 shrink-0 not-italic" aria-hidden />
              {email}
            </a>
            <div>
              <CopyEmailButton email={email} />
            </div>
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

function ContactSkeleton() {
  return (
    <div className="flex flex-col gap-8" aria-hidden>
      <div className="skeleton h-20 w-2/3 rounded-[12px]" />
      <div className="skeleton h-5 w-1/2 rounded-full" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="skeleton h-[88px] rounded-[14px]" />
        ))}
      </div>
    </div>
  );
}

export default function ContactPage({ searchParams }: PageProps<"/[locale]/contact">) {
  return (
    <Suspense fallback={<ContactSkeleton />}>
      <ContactContent searchParams={searchParams} />
    </Suspense>
  );
}
