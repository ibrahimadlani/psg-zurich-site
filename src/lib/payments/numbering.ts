import "server-only";
import { and, eq, sql } from "drizzle-orm";
import type { db } from "@/db";
import { documentNumbers } from "@/db/schema";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Next number of a series, without gaps: the counter row is locked until the transaction
 * that uses the number commits (a rolled-back payment gives its number back).
 * Q = receipts, A = credit notes (per year), P = payment references (year 0, never reset).
 */
export async function nextNumber(tx: Tx, series: "Q" | "A" | "P", year: number) {
  await tx
    .insert(documentNumbers)
    .values({ series, year, last: 0 })
    .onDuplicateKeyUpdate({ set: { last: sql`${documentNumbers.last}` } });
  const [row] = await tx
    .select({ last: documentNumbers.last })
    .from(documentNumbers)
    .where(and(eq(documentNumbers.series, series), eq(documentNumbers.year, year)))
    .for("update");
  const next = (row?.last ?? 0) + 1;
  await tx
    .update(documentNumbers)
    .set({ last: next })
    .where(and(eq(documentNumbers.series, series), eq(documentNumbers.year, year)));
  return next;
}

/** "Q-2026-0001". */
export const documentNumber = (series: "Q" | "A", year: number, number: number) => `${series}-${year}-${String(number).padStart(4, "0")}`;
