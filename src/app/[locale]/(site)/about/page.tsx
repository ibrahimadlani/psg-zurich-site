import { ArrowRight, Flame, HeartHandshake, Users } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { CommitteeList } from "@/components/contact/committee-list";
import { JsonLd } from "@/components/json-ld";
import { PanelSkeleton } from "@/components/skeletons";
import { Streamed } from "@/components/ui/streamed";
import { Link } from "@/i18n/navigation";
import { committeeMembers } from "@/lib/contact";
import { pageMetadata } from "@/lib/seo";
import { breadcrumbs } from "@/lib/structured-data";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata.pages.about");
  return pageMetadata({ path: "/about", title: t("title"), description: t("description") });
}

async function Committee() {
  await connection();
  return <CommitteeList people={await committeeMembers()} />;
}

const VALUES = [
  { key: "passion", Icon: Flame },
  { key: "respect", Icon: HeartHandshake },
  { key: "family", Icon: Users },
] as const;

/** Who the club is: for visitors, and for search engines judging who stands behind the site. */
export default async function AboutPage() {
  const [t, landing, nav, footer, locale] = await Promise.all([getTranslations("About"), getTranslations("Landing"), getTranslations("Nav"), getTranslations("Footer"), getLocale()]);
  return (
    <div className="flex flex-col gap-[clamp(40px,6vw,64px)] [&>*:empty]:hidden">
      <JsonLd
        data={breadcrumbs([
          { name: nav("home"), path: `/${locale}` },
          { name: t("title"), path: `/${locale}/about` },
        ])}
      />
      <header className="flex flex-col gap-4">
        <h1 className="font-narrow text-[length:clamp(44px,9vw,88px)] leading-[0.88] font-extrabold tracking-[-0.01em] uppercase italic">{t("title")}</h1>
        <p className="max-w-[40rem] text-[17px] leading-relaxed text-pretty text-muted-foreground">{landing("about.body1")}</p>
        <p className="max-w-[40rem] text-[17px] leading-relaxed text-pretty text-muted-foreground">{landing("about.body2")}</p>
        <p className="text-[14px] font-semibold">{footer("tagline")}</p>
      </header>

      <ul className="grid gap-3 sm:grid-cols-3">
        {VALUES.map(({ key, Icon }) => (
          <li key={key} className="flex flex-col gap-3 rounded-[16px] border bg-card p-5 shadow-brand">
            <span className="grid size-11 place-items-center rounded-[12px] bg-psg-blue text-white dark:bg-white/10">
              <Icon className="size-5" aria-hidden />
            </span>
            <h2 className="font-narrow text-[24px] leading-none font-extrabold uppercase italic">{landing(`about.values.${key}.title`)}</h2>
            <p className="text-[14px] leading-relaxed text-pretty text-muted-foreground">{landing(`about.values.${key}.body`)}</p>
          </li>
        ))}
      </ul>

      <Streamed fallback={<PanelSkeleton />}>
        <Committee />
      </Streamed>

      <section className="flex flex-wrap items-center gap-x-5 gap-y-3 border-t pt-6">
        <Link href="/join" className="inline-flex h-12 items-center gap-2 rounded-[10px] bg-segment px-6 font-wide text-[12px] font-semibold tracking-[0.06em] text-segment-foreground uppercase shadow-brand transition-opacity hover:opacity-90">
          {t("join")}
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
        <Link href="/statutes" className="border-b pb-0.5 text-[14px] transition-colors hover:border-psg-red">
          {t("statutes")}
        </Link>
        <Link href="/contact" className="border-b pb-0.5 text-[14px] transition-colors hover:border-psg-red">
          {t("contact")}
        </Link>
      </section>
    </div>
  );
}
