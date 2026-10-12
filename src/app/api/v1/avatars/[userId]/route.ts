import { eq } from "drizzle-orm";
import { connection } from "next/server";
import { db } from "@/db";
import { avatars } from "@/db/schema";
import { imageType } from "@/lib/avatars";

/** Serves a profile photo; URLs carry a version (?v=…), so responses are immutable. */
export async function GET(_request: Request, { params }: RouteContext<"/api/v1/avatars/[userId]">) {
  await connection();
  const { userId } = await params;
  const [row] = await db.select({ data: avatars.data }).from(avatars).where(eq(avatars.userId, userId));
  if (!row) return new Response("Not found", { status: 404 });
  const bytes = new Uint8Array(row.data);
  return new Response(bytes, {
    headers: {
      "content-type": imageType(bytes) ?? "application/octet-stream",
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
    },
  });
}
