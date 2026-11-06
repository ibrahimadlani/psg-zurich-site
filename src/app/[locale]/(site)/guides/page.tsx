import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { JsonLd } from "@/components/json-ld";
import { NewsCard } from "@/components/news/news-cards";
import { NewsListSkeleton } from "@/components/skeletons";
import { Streamed } from "@/components/ui/streamed";
import type { Locale } from "@/db/schema";
import { getNewsList } from "@/lib/news";
import { pageMetadata } from "@/lib/seo";
import { breadcrumbs } from "@/lib/structured-data";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata.pages.guides");
  return pageMetadata({ path: "/guides", title: t("title"), description: t("description") });
}

/** The articles that keep their value over time, away from the news of the day. */
async function GuidesContent() {
  await connection();
  const [t, locale] = await Promise.all([getTranslations("Guides"), getLocale()]);
  const all = await getNewsList(locale as Locale);
  const groups = [
    { key: "practical", title: t("practical"), posts: all.filter((post) => post.category === "guides") },
    { key: "trips", title: t("trips"), posts: all.filter((post) => post.category === "trips") },
  ].filter((group) => group.posts.length > 0);
  if (!groups.length) return <p className="border-t py-10 text-center text-[15px] text-muted-foreground">{t("empty")}</p>;
  return (
    <div className="flex flex-col gap-[clamp(40px,6vw,64px)]">
      {groups.map((group) => (
        <section key={group.key} className="flex flex-col gap-5">
          <h2 className="font-narrow text-[length:clamp(28px,4vw,40px)] leading-[0.95] font-extrabold uppercase italic">{group.title}</h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,280px),1fr))] gap-x-6 gap-y-10">
            {group.posts.map((post) => (
              <NewsCard key={post.id} post={post} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export default async function GuidesPage() {
  const [t, nav, locale] = await Promise.all([getTranslations("Guides"), getTranslations("Nav"), getLocale()]);
  return (
    <div className="flex flex-col gap-[clamp(28px,4vw,40px)]">
      <JsonLd
        data={breadcrumbs([
          { name: nav("home"), path: `/${locale}` },
          { name: t("title"), path: `/${locale}/guides` },
        ])}
      />
      <header className="flex flex-col gap-3.5">
        <h1 className="font-narrow text-[length:clamp(44px,9vw,88px)] leading-[0.88] font-extrabold tracking-[-0.01em] uppercase italic">{t("title")}</h1>
        <p className="max-w-[36rem] text-base leading-normal text-pretty text-muted-foreground">{t("intro")}</p>
      </header>
      <Streamed fallback={<NewsListSkeleton />}>
        <GuidesContent />
      </Streamed>
    </div>
  );
}
