import "server-only";
import { and, desc, eq, inArray, lte } from "drizzle-orm";
import { db } from "@/db";
import { events, matches, posts, user, type Locale } from "@/db/schema";
import { parseBlocks, readingMinutes, type Block } from "@/lib/article-blocks";
import { getEventsWithAttendance } from "@/lib/events";

export type Post = typeof posts.$inferSelect;

/** Published and already out (scheduled articles stay hidden until their time). */
const visible = () => and(eq(posts.status, "published"), lte(posts.publishedAt, new Date()));

/**
 * One version per article: the visitor's language when a translation exists, else the
 * original (the post whose id is the translation group), else any.
 */
function pickVersions(rows: Post[], locale: Locale) {
  const groups = new Map<string, Post[]>();
  for (const row of rows) {
    const key = row.translationGroup ?? row.id;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return [...groups.entries()].map(
    ([key, versions]) =>
      versions.find((post) => post.locale === locale) ?? versions.find((post) => post.id === key) ?? versions[0]!,
  );
}

const byDate = (a: Post, b: Post) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0);

/** Every visible article, in the visitor's language where possible, latest first. */
export async function getNewsList(locale: Locale) {
  const rows = await db.select().from(posts).where(visible()).orderBy(desc(posts.publishedAt));
  return pickVersions(rows, locale).sort(byDate);
}

/**
 * Article by slug. If it exists in the visitor's language under another slug, `redirectTo`
 * gives that slug (the page then redirects).
 */
export async function getArticle(slug: string, locale: Locale) {
  const [post] = await db.select().from(posts).where(and(eq(posts.slug, slug), visible()));
  if (!post) return null;
  if (post.locale !== locale && post.translationGroup) {
    const [translation] = await db
      .select({ slug: posts.slug })
      .from(posts)
      .where(and(eq(posts.translationGroup, post.translationGroup), eq(posts.locale, locale), visible()));
    if (translation && translation.slug !== slug) return { post, redirectTo: translation.slug };
  }
  return { post, redirectTo: null };
}

/** Same category first, then the latest; never the article itself. */
export function relatedArticles(all: Post[], current: Post, count = 3) {
  const others = all.filter((post) => (post.translationGroup ?? post.id) !== (current.translationGroup ?? current.id));
  const sameCategory = others.filter((post) => post.category === current.category);
  return [...sameCategory, ...others.filter((post) => post.category !== current.category)].slice(0, count);
}

export const articleReadingMinutes = (post: Post) => readingMinutes(parseBlocks(post.content), post.excerpt ?? "");

/** Matches and events referenced by match / event blocks, fetched in one go. */
export async function blockReferences(blocks: Block[], memberId: string | null) {
  const matchIds = blocks.flatMap((block) => (block.type === "match" && block.matchId ? [block.matchId] : []));
  const eventIds = blocks.flatMap((block) => (block.type === "event" && block.eventId ? [block.eventId] : []));
  const [matchRows, eventRows] = await Promise.all([
    matchIds.length ? db.select().from(matches).where(inArray(matches.id, matchIds)) : [],
    eventIds.length ? getEventsWithAttendance(inArray(events.id, eventIds), memberId) : [],
  ]);
  return {
    matches: new Map(matchRows.map((match) => [match.id, match])),
    events: new Map(eventRows.map((event) => [event.id, event])),
  };
}

/** Name of the account that wrote the article, when no byline is set. */
export async function authorName(authorId: string | null) {
  if (!authorId) return null;
  const [row] = await db.select({ name: user.name }).from(user).where(eq(user.id, authorId));
  return row?.name ?? null;
}
