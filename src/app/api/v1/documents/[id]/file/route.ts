import { eq } from "drizzle-orm";
import { connection } from "next/server";
import { db } from "@/db";
import { documentFiles, documents } from "@/db/schema";
import { apiHandler, fail } from "@/lib/api";
import { visibleDocumentLevels } from "@/lib/documents";

type Context = RouteContext<"/api/v1/documents/[id]/file">;

const EXTENSIONS: Record<string, string> = { "application/pdf": "pdf", "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

/**
 * The file itself, for whoever may see the document (opened in the browser; `?telecharger`
 * saves it). A document one may not see answers 404, as if it did not exist.
 */
export const GET = apiHandler<Context>(async (request, { params }) => {
  await connection();
  const { id } = await params;
  const [row] = await db
    .select({ title: documents.title, visibility: documents.visibility, mimeType: documents.mimeType, data: documentFiles.data })
    .from(documents)
    .innerJoin(documentFiles, eq(documentFiles.documentId, documents.id))
    .where(eq(documents.id, id));
  if (!row || !(await visibleDocumentLevels()).includes(row.visibility)) return fail(404, "not_found", "Document not found.");

  const name = `${row.title.normalize("NFD").replace(/[^\w -]+/g, "").trim().replace(/\s+/g, "-").slice(0, 80) || "document"}.${EXTENSIONS[row.mimeType] ?? "bin"}`;
  const disposition = request.nextUrl.searchParams.has("telecharger") ? "attachment" : "inline";
  return new Response(new Uint8Array(row.data), {
    headers: {
      "content-type": row.mimeType,
      "content-length": String(row.data.byteLength),
      "content-disposition": `${disposition}; filename="${name}"`,
      "x-content-type-options": "nosniff",
      // Members' documents are personal to the session: never kept by shared caches.
      "cache-control": row.visibility === "public" ? "public, max-age=3600" : "private, no-store",
    },
  });
});
