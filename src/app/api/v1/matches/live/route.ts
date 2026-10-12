import { connection } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { matches } from "@/db/schema";
import { apiHandler, ok } from "@/lib/api";

/** Matches being played, read from the database (kept fresh by the sync, no API call here). */
export const GET = apiHandler(async () => {
  await connection();
  const rows = await db.select().from(matches).where(eq(matches.status, "live"));
  return ok(rows);
});
