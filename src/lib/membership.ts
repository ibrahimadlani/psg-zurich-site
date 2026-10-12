import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { members } from "@/db/schema";

/** Football season label: July → June, e.g. "2026/27". */
export function seasonLabel(date = new Date()) {
  const start = date.getUTCMonth() >= 6 ? date.getUTCFullYear() : date.getUTCFullYear() - 1;
  return `${start}/${String((start + 1) % 100).padStart(2, "0")}`;
}

export async function getMemberByUserId(userId: string) {
  const [row] = await db.select().from(members).where(eq(members.userId, userId)).limit(1);
  return row ?? null;
}
