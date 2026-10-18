import "server-only";
import { lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { analyticsEvents, apiUsage, pageViews } from "@/db/schema";
import { routePattern } from "@/lib/analytics/classify";

/*
 * API calls, counted in memory per minute, route and status, then written every minute (the
 * site runs as one Node process). Also where old audience data is purged: kept 13 months.
 */

type Tally = { count: number; totalMs: number; maxMs: number };
const pending = new Map<string, Tally>();
let timer: ReturnType<typeof setInterval> | null = null;

const RETENTION_MS = 400 * 86_400_000;

export function recordApiCall(method: string, pathname: string, status: number, ms: number) {
  if (pathname.startsWith("/api/v1/analytics")) return;
  const bucket = new Date(Math.floor(Date.now() / 60_000) * 60_000).toISOString();
  const key = [bucket, method, routePattern(pathname), `${Math.floor(status / 100)}xx`].join("|");
  const tally = pending.get(key) ?? { count: 0, totalMs: 0, maxMs: 0 };
  tally.count += 1;
  tally.totalMs += Math.round(ms);
  tally.maxMs = Math.max(tally.maxMs, Math.round(ms));
  pending.set(key, tally);
  if (!timer) {
    timer = setInterval(() => void flushApiUsage(), 60_000);
    timer.unref?.();
  }
}

let lastPurge = 0;

export async function flushApiUsage() {
  if (!pending.size) return;
  const rows = [...pending].map(([key, tally]) => {
    const [bucket, method, route, statusClass] = key.split("|") as [string, string, string, string];
    return { bucket: new Date(bucket), method, route, statusClass, ...tally };
  });
  pending.clear();
  try {
    await db
      .insert(apiUsage)
      .values(rows)
      .onDuplicateKeyUpdate({
        set: {
          count: sql`${apiUsage.count} + values(${apiUsage.count})`,
          totalMs: sql`${apiUsage.totalMs} + values(${apiUsage.totalMs})`,
          maxMs: sql`greatest(${apiUsage.maxMs}, values(${apiUsage.maxMs}))`,
        },
      });
    // Once a day: what is older than 13 months goes.
    if (Date.now() - lastPurge > 86_400_000) {
      lastPurge = Date.now();
      const before = new Date(Date.now() - RETENTION_MS);
      await Promise.all([
        db.delete(pageViews).where(lt(pageViews.at, before)),
        db.delete(analyticsEvents).where(lt(analyticsEvents.at, before)),
        db.delete(apiUsage).where(lt(apiUsage.bucket, before)),
      ]);
    }
  } catch (error) {
    console.error("[analytics] api usage not saved", error);
  }
}
