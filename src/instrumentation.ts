// Runs once when the server boots (`node server.js` / `next start`).
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NODE_ENV !== "production" || process.env.MIGRATE_ON_START === "false") return;

  const { runMigrations } = await import("../scripts/migrate.mjs");
  try {
    await runMigrations();
    console.log("[migrate] database is up to date");
  } catch (error) {
    // Keep serving: /api/health will report the database problem.
    console.error("[migrate] failed, starting anyway:", error);
  }
}
