import { and, eq, lte } from "drizzle-orm";
import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { db } from "@/db";
import { posts } from "@/db/schema";
import { routing } from "@/i18n/routing";
import { localeAlternates, publicSiteUrl } from "@/lib/seo";

// Public pages, in every language (member, admin and auth pages are left out).
const PAGES = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/news", priority: 0.9, changeFrequency: "daily" },
  { path: "/matches", priority: 0.8, changeFrequency: "daily" },
  { path: "/events", priority: 0.6, changeFrequency: "weekly" },
  { path: "/donate", priority: 0.4, changeFrequency: "yearly" },
  { path: "/contact", priority: 0.5, changeFrequency: "yearly" },
  { path: "/join", priority: 0.7, changeFrequency: "yearly" },
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Articles come from the database: built at request time, never at build time.
  await connection();
  const site = publicSiteUrl();
  const absolute = (languages: Record<string, string>) =>
    Object.fromEntries(Object.entries(languages).map(([locale, path]) => [locale, `${site}${path}`]));

  const pages = PAGES.flatMap((page) =>
    routing.locales.map((locale) => ({
      url: `${site}/${locale}${page.path === "/" ? "" : page.path}`,
      changeFrequency: page.changeFrequency,
      priority: page.priority,
      alternates: { languages: absolute(localeAlternates(page.path)) },
    })),
  );

  const published = await db
    .select({ slug: posts.slug, locale: posts.locale, group: posts.translationGroup, updatedAt: posts.updatedAt })
    .from(posts)
    .where(and(eq(posts.status, "published"), lte(posts.publishedAt, new Date())));
  const groups = Map.groupBy(published, (post) => post.group ?? post.slug);
  const articles = published.map((post) => {
    const versions = groups.get(post.group ?? post.slug) ?? [];
    return {
      url: `${site}/${post.locale}/news/${post.slug}`,
      lastModified: post.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.7,
      alternates:
        versions.length > 1
          ? { languages: Object.fromEntries(versions.map((version) => [version.locale, `${site}/${version.locale}/news/${version.slug}`])) }
          : undefined,
    };
  });

  return [...pages, ...articles];
}
