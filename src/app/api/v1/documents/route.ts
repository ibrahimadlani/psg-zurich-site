import { connection } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { DOCUMENT_VISIBILITIES, documentFiles, documents } from "@/db/schema";
import { apiHandler, fail, ok } from "@/lib/api";
import { getClientIp, writeAuditLog } from "@/lib/audit";
import { MAX_DOCUMENT_BYTES, documentType, documentUrl, listDocuments, visibleDocumentLevels } from "@/lib/documents";
import { requireCapability } from "@/lib/permissions";

/** The documents the visitor may see (public ones for everyone, members' ones for accepted members). */
export const GET = apiHandler(async () => {
  await connection();
  return ok(await listDocuments(await visibleDocumentLevels()));
});

const fields = z.object({
  title: z.string().trim().min(1).max(200),
  category: z.string().trim().max(80),
  visibility: z.enum(DOCUMENT_VISIBILITIES),
});

/** Upload (multipart form: file, title, category, visibility). PDF or picture, 10 MB at most. */
export const POST = apiHandler(async (request) => {
  const session = await requireCapability("documents");
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return fail(400, "no_file", "A file is required.");
  if (file.size === 0 || file.size > MAX_DOCUMENT_BYTES) return fail(413, "too_large", "File too large (10 MB at most).");
  const data = new Uint8Array(await file.arrayBuffer());
  const mimeType = documentType(data);
  if (!mimeType) return fail(415, "unsupported", "Only PDF and pictures are accepted.");
  const input = fields.parse({ title: form.get("title"), category: form.get("category") ?? "", visibility: form.get("visibility") });

  const id = crypto.randomUUID();
  await db.transaction(async (tx) => {
    await tx.insert(documents).values({
      id,
      title: input.title,
      category: input.category || null,
      visibility: input.visibility,
      mimeType,
      sizeBytes: data.byteLength,
      filePath: documentUrl(id),
    });
    await tx.insert(documentFiles).values({ documentId: id, data: Buffer.from(data) });
    await writeAuditLog(
      {
        actorId: session.user.id,
        action: "document.create",
        entityType: "document",
        entityId: id,
        metadata: { title: input.title, visibility: input.visibility, size: data.byteLength },
        ipAddress: getClientIp(request.headers),
      },
      tx,
    );
  });
  return ok({ id }, { status: 201 });
});
