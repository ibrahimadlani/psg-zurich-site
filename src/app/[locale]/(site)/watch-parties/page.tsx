import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { FaqAccordion } from "@/components/contact/faq-accordion";
import { WatchPartyIllustration } from "@/components/events/event-illustrations";
import { PublicEventList } from "@/components/events/public-event-list";
import { JsonLd } from "@/components/json-ld";
import { PanelSkeleton } from "@/components/skeletons";
import { Streamed } from "@/components/ui/streamed";
import { Link } from "@/i18n/navigation";
import { publicUpcomingEvents } from "@/lib/events";
import { pageMetadata } from "@/lib/seo";
import { breadcrumbs } from "@/lib/structured-data";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata.pages.watchParties");
  return pageMetadata({ path: "/watch-parties", title: t("title"), description: t("description") });
}

async function NextDates() {
  await connection();
  const [t, list] = await Promise.all([getTranslations("WatchParties"), publicUpcomingEvents()]);
  if (!list.length) return <p className="rounded-[14px] border border-dashed p-6 text-center text-[15px] text-muted-foreground">{t("nextEmpty")}</p>;
  return (
    <div className="flex flex-col gap-3">
      <PublicEventList events={list} />
      <p className="text-[13px] text-muted-foreground">{t("nextHint")}</p>
    </div>
  );
}

const sectionTitle = "font-narrow text-[length:clamp(28px,4vw,40px)] leading-[0.95] font-extrabold uppercase italic";

/** "Watch party PSG Zurich": what it is and how to come, for people who don't know the club yet. */
export default async function WatchPartiesPage() {
  const [t, nav, locale] = await Promise.all([getTranslations("WatchParties"), getTranslations("Nav"), getLocale()]);
  const steps = t.raw("steps") as { title: string; body: string }[];
  return (
    <div className="flex flex-col gap-[clamp(40px,6vw,64px)]">
      <JsonLd
        data={breadcrumbs([
          { name: nav("home"), path: `/${locale}` },
          { name: t("title"), path: `/${locale}/watch-parties` },
        ])}
      />
      <header className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="flex flex-col items-start gap-4">
          <h1 className="font-narrow text-[length:clamp(40px,7.5vw,72px)] leading-none font-extrabold tracking-[-0.01em] text-balance uppercase italic">{t("title")}</h1>
          <p className="max-w-[34rem] text-[17px] leading-relaxed text-pretty text-muted-foreground">{t("lead")}</p>
          <Link href="/join" className="inline-flex h-12 items-center gap-2 rounded-[10px] bg-segment px-6 font-wide text-[12px] font-semibold tracking-[0.06em] text-segment-foreground uppercase shadow-brand transition-opacity hover:opacity-90">
            {t("join")}
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </div>
        <div className="aspect-[8/5] overflow-hidden rounded-[20px] shadow-brand ring-1 ring-foreground/10">
          <WatchPartyIllustration label={t("title")} />
        </div>
      </header>

      <section className="flex flex-col gap-5">
        <h2 className={sectionTitle}>{t("howTitle")}</h2>
        <ol className="grid gap-3 sm:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step.title} className="flex flex-col gap-2 rounded-[14px] border bg-card p-4 lg:p-5">
              <span className="grid size-9 place-items-center rounded-full bg-psg-blue font-narrow text-[17px] font-extrabold text-white italic dark:bg-white dark:text-psg-blue">{index + 1}</span>
              <h3 className="text-[16px] font-semibold">{step.title}</h3>
              <p className="text-[14px] leading-relaxed text-pretty text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="flex flex-col gap-5">
        <h2 className={sectionTitle}>{t("nextTitle")}</h2>
        <Streamed fallback={<PanelSkeleton />}>
          <NextDates />
        </Streamed>
      </section>

      <section className="flex flex-col gap-5">
        <h2 className={sectionTitle}>{t("faqTitle")}</h2>
        <FaqAccordion items={t.raw("faq") as { q: string; a: string }[]} />
        <Link href="/guides" className="inline-flex items-center gap-1.5 self-start border-b border-psg-red pb-0.5 text-[14px] font-semibold">
          {t("guide")}
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </section>
    </div>
  );
}
