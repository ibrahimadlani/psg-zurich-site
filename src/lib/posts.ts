import "server-only";
import { eq } from "drizzle-orm";
import type { z } from "zod";
import { db } from "@/db";
import { posts } from "@/db/schema";
import { HttpError } from "@/lib/permissions";
import type { createPostSchema } from "@/lib/validators";

type PostInput = z.infer<typeof createPostSchema>;

/** Row values from the CMS form (shared by create and update). */
/** `existing`: current publication date (kept when an already published article is edited). */
export async function postValues(input: PostInput, id: string, existing: Date | null = null) {
  let translationGroup = id;
  if (input.translationOf) {
    const [original] = await db
      .select({ id: posts.id, group: posts.translationGroup })
      .from(posts)
      .where(eq(posts.id, input.translationOf));
    if (!original || original.id === id) throw new HttpError(400, "invalid_translation", "Unknown original article.");
    translationGroup = original.group ?? original.id;
  }
  return {
    slug: input.slug,
    locale: input.locale,
    title: input.title,
    excerpt: input.excerpt || null,
    category: input.category,
    byline: input.byline || null,
    imageUrl: input.imageUrl ?? null,
    content: JSON.stringify(input.blocks),
    translationGroup,
    status: input.status,
    publishedAt: input.status === "published" ? (input.publishedAt ?? existing ?? new Date()) : null,
  };
}
