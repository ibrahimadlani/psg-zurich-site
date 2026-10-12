import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import type { Access } from "@/components/matches/prediction-card";
import { ArticleBody } from "@/components/news/article-body";
import { CopyLinkButton } from "@/components/news/copy-link-button";
import { NewsCard, NewsCover } from "@/components/news/news-cards";
import { type Locale } from "@/db/schema";
import { Link, redirect } from "@/i18n/navigation";
import { parseBlocks } from "@/lib/article-blocks";
import { getCurrentMember } from "@/lib/members";
import { articleReadingMinutes, authorName, blockReferences, getArticle, getNewsList, relatedArticles } from "@/lib/news";
import { getSession } from "@/lib/permissions";

// Slugs only exist at runtime: rendered on the server at navigation time (like match pages).
export const instant = false;

export async function generateMetadata({ params }: PageProps<"/[locale]/actualites/[slug]">): Promise<Metadata> {
  const found = await getArticle((await params).slug, (await getLocale()) as Locale);
  if (!found) return {};
  const { post } = found;
  return {
    title: post.title,
    description: post.excerpt ?? undefined,
    openGraph: { type: "article", title: post.title, description: post.excerpt ?? undefined, images: post.imageUrl ? [post.imageUrl] : undefined },
  };
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
  if (found.redirectTo) redirect({ href: `/actualites/${found.redirectTo}`, locale });
  const { post } = found;

  const t = await getTranslations("News");
  const format = await getFormatter();
  const blocks = parseBlocks(post.content);
  const [session, member, all, author] = await Promise.all([
    getSession(),
    getCurrentMember(),
    getNewsList(locale),
    post.byline ? Promise.resolve(post.byline) : authorName(post.authorId),
  ]);
  const access: Access = !session ? "guest" : member?.status === "active" ? "member" : "inactive";
  const refs = await blockReferences(blocks, member?.id ?? null);
  const related = relatedArticles(all, post);
  const signature = author ?? t("defaultByline");

  return (
    <article className="flex flex-col gap-[clamp(28px,4vw,40px)]">
      <div className="mx-auto flex w-full max-w-[44rem] flex-col gap-5">
        <Link href="/actualites" className="inline-flex items-center gap-2 self-start text-sm text-muted-foreground hover:text-foreground">
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

      <ArticleBody blocks={blocks} refs={refs} access={access} />

      {related.length > 0 ? (
        <section className="mt-[clamp(24px,5vw,48px)] flex flex-col gap-6 border-t pt-[clamp(28px,4vw,40px)]">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-narrow text-[length:clamp(28px,4vw,40px)] leading-[0.95] font-extrabold uppercase italic">{t("more")}</h2>
            <Link href="/actualites" className="border-b pb-[3px] text-sm whitespace-nowrap text-muted-foreground transition-colors hover:border-psg-red hover:text-foreground">
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

export default function ArticlePage({ params }: PageProps<"/[locale]/actualites/[slug]">) {
  return (
    <Suspense>
      <ArticleContent params={params} />
    </Suspense>
  );
}
