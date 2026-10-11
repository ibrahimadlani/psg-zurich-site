// Applies pending Drizzle migrations from ./drizzle — no drizzle-kit needed.
//
//   node scripts/migrate.mjs                    # uses DATABASE_URL from the environment
//   node --env-file=.env scripts/migrate.mjs    # or loads it from a file
//
// Also imported by src/instrumentation.ts to migrate automatically when the server starts.
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql from "mysql2/promise";

/**
 * @param {{ databaseUrl?: string, migrationsFolder?: string }} [options]
 * @returns {Promise<void>}
 */
export async function runMigrations({
  databaseUrl = process.env.DATABASE_URL,
  migrationsFolder = path.join(process.cwd(), "drizzle"),
} = {}) {
  if (!databaseUrl) throw new Error("DATABASE_URL is not set.");

  const connection = await mysql.createConnection({ uri: databaseUrl, timezone: "Z" });
  try {
    await connection.query("SET time_zone = '+00:00'");
    await migrate(drizzle(connection), { migrationsFolder });
  } finally {
    await connection.end();
  }
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (invokedDirectly) {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  try {
    await runMigrations({ migrationsFolder: path.join(scriptDir, "..", "drizzle") });
    console.log("[migrate] database is up to date");
  } catch (error) {
    console.error("[migrate] failed:", error);
    process.exitCode = 1;
  }
}
