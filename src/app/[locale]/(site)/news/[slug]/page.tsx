import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { ArticleBody } from "@/components/news/article-body";
import { CopyLinkButton } from "@/components/news/copy-link-button";
import { NewsCard, NewsCover } from "@/components/news/news-cards";
import { type Locale } from "@/db/schema";
import { Link, redirect } from "@/i18n/navigation";
import { isDuesPaid } from "@/lib/dues";
import { parseBlocks } from "@/lib/article-blocks";
import { getCurrentMember } from "@/lib/members";
import {
  articleReadingMinutes,
  articleVersions,
  authorName,
  blockReferences,
  getArticle,
  getNewsList,
  relatedArticles,
  type Post,
} from "@/lib/news";
import { publicSiteUrl } from "@/lib/seo";
import { ArticleSkeleton } from "@/components/skeletons";

// Slugs only exist at runtime: rendered on the server at navigation time (like match pages).
export const instant = false;

export async function generateMetadata({ params }: PageProps<"/[locale]/news/[slug]">): Promise<Metadata> {
  // Visibility depends on the current time (scheduled articles): request time only.
  await connection();
  const found = await getArticle((await params).slug, (await getLocale()) as Locale);
  if (!found) return {};
  const { post } = found;
  const versions = await articleVersions(post);
  const languages = Object.fromEntries(versions.map((version) => [version.locale, `/${version.locale}/news/${version.slug}`]));
  const original = versions.find((version) => version.locale === "fr") ?? versions[0];
  return {
    title: post.title,
    description: post.excerpt ?? undefined,
    alternates: {
      canonical: `/${post.locale}/news/${post.slug}`,
      // Only when the article exists in more than one language.
      languages: versions.length > 1 ? { ...languages, "x-default": languages[original!.locale]! } : undefined,
    },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt ?? undefined,
      locale: post.locale,
      publishedTime: post.publishedAt?.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      images: post.imageUrl ? [post.imageUrl] : undefined,
    },
  };
}

/** NewsArticle structured data (search results), with absolute addresses. */
function articleJsonLd(post: Post, author: string) {
  const site = publicSiteUrl();
  const absolute = (path: string) => (path.startsWith("http") ? path : `${site}${path}`);
  const club = { "@type": "Organization", name: "PSG Zurich Supporters Club", url: site, logo: absolute("/brand/psg-crest.svg") };
  const data = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: post.title,
    description: post.excerpt ?? undefined,
    inLanguage: post.locale,
    datePublished: post.publishedAt?.toISOString(),
    // Never before the publication date (an article can be published without being edited).
    dateModified: new Date(Math.max(post.updatedAt.getTime(), post.publishedAt?.getTime() ?? 0)).toISOString(),
    image: post.imageUrl ? [absolute(post.imageUrl)] : undefined,
    author: author === club.name ? club : { "@type": "Organization", name: author, url: site },
    publisher: club,
    mainEntityOfPage: absolute(`/${post.locale}/news/${post.slug}`),
  };
  // "<" escaped so the text can never close the script tag.
  return { __html: JSON.stringify(data).replace(/</g, "\\u003c") };
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter((word) => /\p{L}/u.test(word[0] ?? ""))
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join("") || "PZ";

const meta = "font-wide text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase";

async function ArticleContent({ params }: { params: Promise<{ slug: string }> }) {
  await connection();
  const { slug } = await params;
  const locale = (await getLocale()) as Locale;
  const found = await getArticle(slug, locale);
  if (!found) notFound();
  if (found.redirectTo) redirect({ href: `/news/${found.redirectTo}`, locale });
  const { post } = found;

  const t = await getTranslations("News");
  const format = await getFormatter();
  const blocks = parseBlocks(post.content);
  const [member, all, author] = await Promise.all([
    getCurrentMember(),
    getNewsList(locale),
    post.byline ? Promise.resolve(post.byline) : authorName(post.authorId),
  ]);
  const refs = await blockReferences(blocks, member?.id ?? null);
  const related = relatedArticles(all, post);
  const signature = author ?? t("defaultByline");

  return (
    <article className="flex flex-col gap-[clamp(28px,4vw,40px)]">
      <script type="application/ld+json" dangerouslySetInnerHTML={articleJsonLd(post, signature)} />
      <div className="mx-auto flex w-full max-w-[44rem] flex-col gap-5">
        <Link href="/news" className="inline-flex items-center gap-2 self-start text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" aria-hidden />
          {t("back")}
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-2.5">
          <span className="inline-flex h-[22px] items-center rounded-full bg-psg-red px-[9px] font-wide text-[9px] font-semibold tracking-[0.08em] text-white uppercase">
            {t(`categories.${post.category}`)}
          </span>
          <span className={meta}>
            {post.publishedAt ? format.dateTime(post.publishedAt, { day: "numeric", month: "short", year: "numeric" }) : null} ·{" "}
            {t("readingTime", { minutes: articleReadingMinutes(post) })}
          </span>
        </div>
        <h1 className="font-narrow text-[length:clamp(34px,6.4vw,68px)] leading-[0.92] font-extrabold tracking-[-0.01em] text-balance [overflow-wrap:anywhere] hyphens-auto uppercase italic">
          {post.title}
        </h1>
        {post.excerpt ? (
          <p className="text-[length:clamp(18px,2.2vw,21px)] leading-normal text-pretty text-muted-foreground">{post.excerpt}</p>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex size-8 items-center justify-center rounded-full bg-segment font-wide text-[9px] font-semibold text-segment-foreground">
              {initials(signature)}
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold">{signature}</span>
              <span className="text-xs text-muted-foreground">PSG Zurich</span>
            </span>
          </div>
          <CopyLinkButton />
        </div>
      </div>

      {post.imageUrl ? <NewsCover post={post} priority className="aspect-video w-full rounded-[14px]" /> : null}

      <ArticleBody blocks={blocks} refs={refs} eventsOpen={isDuesPaid(member)} />

      {related.length > 0 ? (
        <section className="mt-[clamp(24px,5vw,48px)] flex flex-col gap-6 border-t pt-[clamp(28px,4vw,40px)]">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-narrow text-[length:clamp(28px,4vw,40px)] leading-[0.95] font-extrabold uppercase italic">{t("more")}</h2>
            <Link href="/news" className="border-b pb-[3px] text-sm whitespace-nowrap text-muted-foreground transition-colors hover:border-psg-red hover:text-foreground">
              {t("seeAll")}
            </Link>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,280px),1fr))] gap-x-6 gap-y-10">
            {related.map((item) => (
              <NewsCard key={item.id} post={item} withExcerpt={false} />
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}

export default function ArticlePage({ params }: PageProps<"/[locale]/news/[slug]">) {
  return (
    <Suspense fallback={<ArticleSkeleton />}>
      <ArticleContent params={params} />
    </Suspense>
  );
}
