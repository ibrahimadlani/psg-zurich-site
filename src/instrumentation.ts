// Runs once when the server boots (`node server.js` / `next start`).
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NODE_ENV !== "production") return;

  // Pages cached on disk by a previous version (see isrFlushToDisk in next.config.ts)
  // reference its JS/CSS files, deleted by the deploy: never serve them.
  const { rm } = await import("node:fs/promises");
  const { join } = await import("node:path");
  await rm(join(process.cwd(), ".next", "server", "route-cache"), { recursive: true, force: true });

  if (process.env.MIGRATE_ON_START === "false") return;

  const { runMigrations } = await import("../scripts/migrate.mjs");
  try {
    await runMigrations();
    console.log("[migrate] database is up to date");
  } catch (error) {
    // Keep serving: /api/health will report the database problem.
    console.error("[migrate] failed, starting anyway:", error);
  }
}
