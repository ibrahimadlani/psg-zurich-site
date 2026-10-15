import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { DOCUMENT_VISIBILITIES, documents } from "@/db/schema";
import { apiHandler, ok, parseBody } from "@/lib/api";
import { getClientIp, writeAuditLog } from "@/lib/audit";
import { HttpError, requireCapability } from "@/lib/permissions";

type Context = RouteContext<"/api/v1/documents/[id]">;

async function findOrThrow(id: string) {
  const [row] = await db.select({ id: documents.id, title: documents.title }).from(documents).where(eq(documents.id, id));
  if (!row) throw new HttpError(404, "not_found", "Document not found.");
  return row;
}

/** Rename, move to another category, or change who may see it (the file stays). */
export const PATCH = apiHandler<Context>(async (request, { params }) => {
  const session = await requireCapability("documents");
  const { id } = await params;
  const input = await parseBody(
    request,
    z.object({ title: z.string().trim().min(1).max(200), category: z.string().trim().max(80), visibility: z.enum(DOCUMENT_VISIBILITIES) }),
  );
  await findOrThrow(id);
  await db.transaction(async (tx) => {
    await tx.update(documents).set({ title: input.title, category: input.category || null, visibility: input.visibility }).where(eq(documents.id, id));
    await writeAuditLog(
      { actorId: session.user.id, action: "document.update", entityType: "document", entityId: id, metadata: input, ipAddress: getClientIp(request.headers) },
      tx,
    );
  });
  return ok({ id });
});

export const DELETE = apiHandler<Context>(async (request, { params }) => {
  const session = await requireCapability("documents");
  const { id } = await params;
  const document = await findOrThrow(id);
  await db.transaction(async (tx) => {
    // The file goes with it (ON DELETE CASCADE).
    await tx.delete(documents).where(eq(documents.id, id));
    await writeAuditLog(
      { actorId: session.user.id, action: "document.delete", entityType: "document", entityId: id, metadata: { title: document.title }, ipAddress: getClientIp(request.headers) },
      tx,
    );
  });
  return ok({ deleted: true });
});
