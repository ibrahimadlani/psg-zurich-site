import { eq } from "drizzle-orm";
import { db } from "@/db";
import { avatars, user } from "@/db/schema";
import { apiHandler, fail, ok } from "@/lib/api";
import { imageType, MAX_AVATAR_BYTES } from "@/lib/avatars";
import { requireRole } from "@/lib/permissions";

/** Profile photo, sent as raw bytes (already cropped and resized to 256 px by the browser). */
export const PUT = apiHandler(async (request) => {
  const session = await requireRole("member");
  const data = new Uint8Array(await request.arrayBuffer());
  if (data.byteLength === 0 || data.byteLength > MAX_AVATAR_BYTES) return fail(413, "too_large", "Image too large.");
  if (!imageType(data)) return fail(415, "unsupported", "Unsupported image type.");

  const now = new Date();
  const buffer = Buffer.from(data);
  await db
    .insert(avatars)
    .values({ userId: session.user.id, data: buffer, updatedAt: now })
    .onDuplicateKeyUpdate({ set: { data: buffer, updatedAt: now } });
  // Versioned URL: the image itself can be cached forever.
  const image = `/api/v1/avatars/${session.user.id}?v=${now.getTime()}`;
  await db.update(user).set({ image }).where(eq(user.id, session.user.id));
  return ok({ image });
});

export const DELETE = apiHandler(async () => {
  const session = await requireRole("member");
  await db.delete(avatars).where(eq(avatars.userId, session.user.id));
  await db.update(user).set({ image: null }).where(eq(user.id, session.user.id));
  return ok({ image: null });
});
