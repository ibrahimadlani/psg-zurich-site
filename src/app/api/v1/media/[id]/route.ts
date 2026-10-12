import { eq } from "drizzle-orm";
import { connection } from "next/server";
import { db } from "@/db";
import { media } from "@/db/schema";

/** Article images never change once uploaded: cached for good. */
export async function GET(_request: Request, { params }: RouteContext<"/api/v1/media/[id]">) {
  await connection();
  const { id } = await params;
  const [row] = await db.select({ data: media.data, contentType: media.contentType }).from(media).where(eq(media.id, id));
  if (!row) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(row.data), {
    headers: {
      "content-type": row.contentType,
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
    },
  });
}
