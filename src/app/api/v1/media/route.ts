import { db } from "@/db";
import { media } from "@/db/schema";
import { apiHandler, fail, ok } from "@/lib/api";
import { imageType } from "@/lib/avatars";
import { requireRole } from "@/lib/permissions";

const MAX_BYTES = 1.5 * 1024 * 1024;

/** Article image, sent as raw bytes already resized by the browser (?w=&h= give its size). */
export const POST = apiHandler(async (request) => {
  const session = await requireRole("admin");
  const data = new Uint8Array(await request.arrayBuffer());
  if (data.byteLength === 0 || data.byteLength > MAX_BYTES) return fail(413, "too_large", "Image too large.");
  const type = imageType(data);
  if (!type) return fail(415, "unsupported", "Unsupported image type.");
  const size = (name: string) => Math.max(1, Math.min(10_000, Number(request.nextUrl.searchParams.get(name)) || 1));

  const id = crypto.randomUUID();
  await db.insert(media).values({
    id,
    data: Buffer.from(data),
    contentType: type,
    width: size("w"),
    height: size("h"),
    uploadedBy: session.user.id,
  });
  return ok({ id, url: `/api/v1/media/${id}` }, { status: 201 });
});
