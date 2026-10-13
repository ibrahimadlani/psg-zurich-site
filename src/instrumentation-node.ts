import { rm } from "node:fs/promises";
import { join } from "node:path";

/** Production server start (Node.js runtime only, imported by instrumentation.ts). */
export async function onServerStart() {
  // Pages cached on disk by a previous version (see isrFlushToDisk in next.config.ts)
  // reference its JS/CSS files, deleted by the deploy: never serve them.
  await rm(join(process.cwd(), ".next", "server", "route-cache"), { recursive: true, force: true });

  if (process.env.MIGRATE_ON_START !== "false") {
    const { runMigrations } = await import("../scripts/migrate.mjs");
    try {
      await runMigrations();
      console.log("[migrate] database is up to date");
    } catch (error) {
      // Keep serving: /api/health will report the database problem.
      console.error("[migrate] failed, starting anyway:", error);
    }
  }

  // PSG matches from football-data.org (no-op without FOOTBALL_DATA_KEY).
  const { startFootballSync } = await import("@/lib/football/scheduler");
  startFootballSync();

  // Automated emails: queue worker and periodic scans (src/lib/mailing).
  const { startMailing } = await import("@/lib/mailing");
  startMailing();
}
