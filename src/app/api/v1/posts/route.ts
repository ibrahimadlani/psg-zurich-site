import { and, desc, eq, lte } from "drizzle-orm";
import { db } from "@/db";
import { posts } from "@/db/schema";
import { apiHandler, ok, parseBody, parseQuery } from "@/lib/api";
import { getClientIp, writeAuditLog } from "@/lib/audit";
import { requireRole } from "@/lib/permissions";
import { postValues } from "@/lib/posts";
import { createPostSchema, postsQuery } from "@/lib/validators";

export const GET = apiHandler(async (request) => {
  const { limit, offset, locale } = parseQuery(request, postsQuery);
  const rows = await db
    .select({
      id: posts.id,
      slug: posts.slug,
      locale: posts.locale,
      title: posts.title,
      excerpt: posts.excerpt,
      imageUrl: posts.imageUrl,
      publishedAt: posts.publishedAt,
    })
    .from(posts)
    .where(and(eq(posts.status, "published"), lte(posts.publishedAt, new Date()), locale ? eq(posts.locale, locale) : undefined))
    .orderBy(desc(posts.publishedAt))
    .limit(limit)
    .offset(offset);
  return ok(rows);
});

export const POST = apiHandler(async (request) => {
  const session = await requireRole("admin");
  const input = await parseBody(request, createPostSchema);

  const id = crypto.randomUUID();
  const values = await postValues(input, id);
  const created = await db.transaction(async (tx) => {
    await tx.insert(posts).values({ ...values, id, authorId: session.user.id });
    await writeAuditLog(
      {
        actorId: session.user.id,
        action: "post.create",
        entityType: "post",
        entityId: id,
        metadata: { slug: input.slug, status: input.status },
        ipAddress: getClientIp(request.headers),
      },
      tx,
    );
    const [row] = await tx.select().from(posts).where(eq(posts.id, id));
    return row;
  });

  return ok(created, { status: 201 });
});
