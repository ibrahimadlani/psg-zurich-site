import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { posts, postSlugHistory } from "@/db/schema";

/*
 * Addresses articles used to have. A renamed article keeps its links and its place in search
 * results: the old address answers with a permanent redirect (proxy.ts).
 */

let cache: { moves: Map<string, string>; at: number } | null = null;
/** The proxy asks on every article view: read at most once a minute. */
const MAX_AGE_MS = 60_000;

/** The current slug of an article that used to be at `slug`, or null. */
export async function movedSlug(slug: string) {
  if (!cache || Date.now() - cache.at > MAX_AGE_MS) {
    const rows = await db.select({ old: postSlugHistory.slug, current: posts.slug }).from(postSlugHistory).innerJoin(posts, eq(posts.id, postSlugHistory.postId));
    cache = { moves: new Map(rows.map((row) => [row.old, row.current])), at: Date.now() };
  }
  return cache.moves.get(slug) ?? null;
}

/** After a rename: the old address now leads here, and the new one belongs to this article alone. */
export async function recordSlugChange(postId: string, oldSlug: string, newSlug: string) {
  if (oldSlug === newSlug) return;
  await db.delete(postSlugHistory).where(eq(postSlugHistory.slug, newSlug));
  await db.insert(postSlugHistory).values({ slug: oldSlug, postId }).onDuplicateKeyUpdate({ set: { postId } });
  cache = null;
}
