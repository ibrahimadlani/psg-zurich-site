import "server-only";
import { like, sql } from "drizzle-orm";
import { db, type Transaction } from "@/db";
import { members } from "@/db/schema";

const NUMBER_PREFIX = "PSGZ-";

/** Next member number: PSGZ-0001, PSGZ-0002… (the UNIQUE constraint guards against races). */
export async function nextMemberNumber(tx: Transaction | typeof db = db) {
  const [row] = await tx
    .select({ max: sql<number | null>`MAX(CAST(SUBSTRING(${members.memberNumber}, ${NUMBER_PREFIX.length + 1}) AS UNSIGNED))` })
    .from(members)
    .where(like(members.memberNumber, `${NUMBER_PREFIX}%`));
  return `${NUMBER_PREFIX}${String(Number(row?.max ?? 0) + 1).padStart(4, "0")}`;
}
