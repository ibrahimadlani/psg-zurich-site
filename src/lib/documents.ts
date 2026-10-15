import "server-only";
import { desc, inArray } from "drizzle-orm";
import { db } from "@/db";
import { documents, type DOCUMENT_VISIBILITIES } from "@/db/schema";
import { imageType } from "@/lib/avatars";
import { getCurrentMember } from "@/lib/members";
import { getSession } from "@/lib/permissions";
import { can } from "@/lib/roles";

export type DocumentVisibility = (typeof DOCUMENT_VISIBILITIES)[number];

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

/**
 * Kinds of file the club shares, recognised by their first bytes (never by the name or the
 * browser's word): PDF and pictures. Anything else (HTML, SVG, office files with macros…) is
 * refused, so a document can never run code in a visitor's browser.
 */
export function documentType(data: Uint8Array): "application/pdf" | "image/webp" | "image/png" | "image/jpeg" | null {
  if (String.fromCharCode(...data.subarray(0, 5)) === "%PDF-") return "application/pdf";
  return imageType(data);
}

/** Which documents the current visitor may see: everyone the public ones, accepted members theirs, the committee all. */
export async function visibleDocumentLevels(): Promise<DocumentVisibility[]> {
  const session = await getSession();
  if (!session) return ["public"];
  if (can(session.user.role, "documents")) return ["public", "members", "admins"];
  const member = await getCurrentMember();
  return member?.status === "active" ? ["public", "members"] : ["public"];
}

/** Document list (no file bytes), newest first. */
export function listDocuments(levels: DocumentVisibility[]) {
  return db
    .select({
      id: documents.id,
      title: documents.title,
      category: documents.category,
      visibility: documents.visibility,
      mimeType: documents.mimeType,
      sizeBytes: documents.sizeBytes,
      createdAt: documents.createdAt,
    })
    .from(documents)
    .where(inArray(documents.visibility, levels))
    .orderBy(desc(documents.createdAt));
}
export type DocumentRow = Awaited<ReturnType<typeof listDocuments>>[number];

export const documentUrl = (id: string) => `/api/v1/documents/${id}/file`;
