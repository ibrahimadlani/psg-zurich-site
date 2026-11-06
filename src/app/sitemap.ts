import { and, eq, lte } from "drizzle-orm";
import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { db } from "@/db";
import { matches, posts } from "@/db/schema";
import { routing } from "@/i18n/routing";
import { publicUpcomingEvents } from "@/lib/events";
import { matchIndexable, matchPath } from "@/lib/match-seo";
import { localeAlternates, publicSiteUrl } from "@/lib/seo";

// Public pages, in every language (member, admin and auth pages are left out).
const PAGES = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/guides", priority: 0.9, changeFrequency: "weekly" },
  { path: "/watch-parties", priority: 0.9, changeFrequency: "weekly" },
  { path: "/news", priority: 0.9, changeFrequency: "daily" },
  { path: "/matches", priority: 0.8, changeFrequency: "daily" },
  { path: "/events", priority: 0.6, changeFrequency: "weekly" },
  { path: "/donate", priority: 0.4, changeFrequency: "yearly" },
  { path: "/contact", priority: 0.5, changeFrequency: "yearly" },
  { path: "/join", priority: 0.7, changeFrequency: "yearly" },
  { path: "/about", priority: 0.6, changeFrequency: "yearly" },
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

  // The match and event pages open to search engines, under the same rules as their own pages.
  const dynamic = (path: string, lastModified?: Date) =>
    routing.locales.map((locale) => ({
      url: `${site}/${locale}${path}`,
      lastModified,
      changeFrequency: "daily" as const,
      priority: 0.6,
      alternates: { languages: absolute(localeAlternates(path)) },
    }));
  const [seasonMatches, openEvents] = await Promise.all([
    db
      .select({ id: matches.id, venue: matches.venue, opponent: matches.opponent, competition: matches.competition, status: matches.status, kickoffAt: matches.kickoffAt, timeline: matches.timeline, updatedAt: matches.updatedAt })
      .from(matches),
    publicUpcomingEvents(100),
  ]);
  const matchPages = seasonMatches.filter((match) => matchIndexable(match)).flatMap((match) => dynamic(matchPath(match), match.updatedAt));
  const eventPages = openEvents.flatMap((event) => dynamic(`/events/${event.id}`));

  return [...pages, ...articles, ...matchPages, ...eventPages];
}
