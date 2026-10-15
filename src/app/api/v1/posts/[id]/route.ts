import { eq } from "drizzle-orm";
import { db } from "@/db";
import { posts } from "@/db/schema";
import { apiHandler, ok, parseBody } from "@/lib/api";
import { getClientIp, writeAuditLog } from "@/lib/audit";
import { HttpError, requireCapability } from "@/lib/permissions";
import { postValues } from "@/lib/posts";
import { createPostSchema } from "@/lib/validators";

type Context = RouteContext<"/api/v1/posts/[id]">;

async function findOrThrow(id: string) {
  const [row] = await db.select().from(posts).where(eq(posts.id, id));
  if (!row) throw new HttpError(404, "not_found", "Article not found.");
  return row;
}

/** Full article for the CMS (drafts included). */
export const GET = apiHandler<Context>(async (_request, { params }) => {
  await requireCapability("news");
  return ok(await findOrThrow((await params).id));
});

export const PATCH = apiHandler<Context>(async (request, { params }) => {
  const session = await requireCapability("news");
  const { id } = await params;
  const input = await parseBody(request, createPostSchema);
  const current = await findOrThrow(id);
  const values = await postValues(input, id, current.status === "published" ? current.publishedAt : null);
  // An original keeps its group (its translations point to it).
  if (!input.translationOf && current.translationGroup) values.translationGroup = current.translationGroup;

  const updated = await db.transaction(async (tx) => {
    await tx.update(posts).set(values).where(eq(posts.id, id));
    await writeAuditLog(
      {
        actorId: session.user.id,
        action: "post.update",
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
  return ok(updated);
});

export const DELETE = apiHandler<Context>(async (request, { params }) => {
  const session = await requireCapability("news");
  const { id } = await params;
  const post = await findOrThrow(id);
  await db.transaction(async (tx) => {
    await tx.delete(posts).where(eq(posts.id, id));
    await writeAuditLog(
      {
        actorId: session.user.id,
        action: "post.delete",
        entityType: "post",
        entityId: id,
        metadata: { slug: post.slug, title: post.title },
        ipAddress: getClientIp(request.headers),
      },
      tx,
    );
  });
  return ok({ deleted: true });
});
