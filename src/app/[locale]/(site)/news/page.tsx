import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { FeaturedNews, NewsCard } from "@/components/news/news-cards";
import { POST_CATEGORIES, type Locale, type PostCategory } from "@/db/schema";
import { Link } from "@/i18n/navigation";
import { getNewsList } from "@/lib/news";
import { cn } from "@/lib/utils";
import { NewsListSkeleton } from "@/components/skeletons";
import { Streamed } from "@/components/ui/streamed";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("News");
  return { title: t("title"), description: t("intro") };
}

const tabClass = (selected: boolean) =>
  cn(
    "inline-flex h-8 items-center gap-1.5 rounded-full border px-3.5 text-[13px] whitespace-nowrap transition-colors",
    selected ? "border-segment bg-segment text-segment-foreground" : "text-muted-foreground hover:border-foreground/30 hover:text-foreground",
  );

async function NewsContent({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const t = await getTranslations("News");
  const locale = (await getLocale()) as Locale;
  const requested = (await searchParams).categorie;
  const category = (POST_CATEGORIES as readonly string[]).includes(String(requested)) ? (requested as PostCategory) : null;

  const all = await getNewsList(locale);
  const shown = category ? all.filter((post) => post.category === category) : all;
  const count = (value: PostCategory | null) => (value ? all.filter((post) => post.category === value).length : all.length);
  const [featured, ...rest] = shown;

  return (
    <div className="flex flex-col gap-[clamp(28px,4vw,40px)]">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
        <div className="flex flex-col gap-3.5">
          <h1 className="font-narrow text-[length:clamp(44px,9vw,88px)] leading-[0.88] font-extrabold tracking-[-0.01em] uppercase italic">
            {t("title")}
          </h1>
          <p className="text-base leading-normal text-muted-foreground">{t("intro")}</p>
        </div>
        {/* Scrolls sideways on narrow phones rather than wrapping on three lines. */}
        <nav aria-label={t("categoriesLabel")} className="-mx-4 flex max-w-[100vw] gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
          {[null, ...POST_CATEGORIES].map((value) => (
            <Link
              key={value ?? "all"}
              href={value ? `/news?categorie=${value}` : "/news"}
              scroll={false}
              aria-current={value === category ? "page" : undefined}
              className={tabClass(value === category)}
            >
              {value ? t(`categories.${value}`) : t("all")}
              <span className="text-xs tabular-nums opacity-60">{count(value)}</span>
            </Link>
          ))}
        </nav>
      </div>

      {featured ? <FeaturedNews post={featured} /> : null}
      {rest.length > 0 ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,280px),1fr))] gap-x-6 gap-y-10">
          {rest.map((post) => (
            <NewsCard key={post.id} post={post} />
          ))}
        </div>
      ) : null}
      {shown.length === 0 ? <p className="border-t py-10 text-center text-[15px] text-muted-foreground">{t("empty")}</p> : null}
    </div>
  );
}

export default function NewsPage({ searchParams }: PageProps<"/[locale]/news">) {
  return (
    <Streamed fallback={<NewsListSkeleton />}>
      <NewsContent searchParams={searchParams} />
    </Streamed>
  );
}
