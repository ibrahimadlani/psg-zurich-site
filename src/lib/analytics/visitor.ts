import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { eq, lt } from "drizzle-orm";
import { db } from "@/db";
import { analyticsSalts } from "@/db/schema";

/*
 * The anonymous visitor: sha256(salt of the day + IP + browser), cut to 32 characters. The IP
 * is only used here, never stored; the salt is random, new every UTC day and deleted after
 * 48 h — after that, nobody (not even us) can tell who a hash was, nor link two days.
 */

let cached: { day: string; salt: string } | null = null;
const dayOf = (date: Date) => date.toISOString().slice(0, 10);

async function saltOfToday() {
  const day = dayOf(new Date());
  if (cached?.day === day) return cached.salt;
  let [row] = await db.select().from(analyticsSalts).where(eq(analyticsSalts.day, day));
  if (!row) {
    // Two first visits at the same instant: the first salt written wins, both read it back.
    await db.insert(analyticsSalts).values({ day, salt: randomBytes(32).toString("hex") }).onDuplicateKeyUpdate({ set: { day } });
    [row] = await db.select().from(analyticsSalts).where(eq(analyticsSalts.day, day));
    // Yesterday's salt may stay (nothing reads it); anything older goes.
    await db.delete(analyticsSalts).where(lt(analyticsSalts.day, dayOf(new Date(Date.now() - 86_400_000))));
  }
  cached = { day, salt: row!.salt };
  return cached.salt;
}

export async function visitorHash(ip: string, userAgent: string) {
  const salt = await saltOfToday();
  return createHash("sha256").update(`${salt}|${ip}|${userAgent}`).digest("hex").slice(0, 32);
}
