import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

function createPool() {
  const pool = mysql.createPool({
    uri: process.env.DATABASE_URL,
    // Shared hosting: keep the footprint small.
    connectionLimit: 5,
    // Every date goes in and out of the database as UTC.
    timezone: "Z",
  });
  pool.pool.on("connection", (connection) => {
    connection.query("SET time_zone = '+00:00'");
  });
  return pool;
}

// Reuse the pool across hot reloads in development.
const globalForDb = globalThis as unknown as {
  pool?: ReturnType<typeof createPool>;
};
const pool = globalForDb.pool ?? createPool();
if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

// MariaDB note: relational queries with `with: {...}` compile to LATERAL joins or nested
// correlated subqueries that MariaDB rejects. Use explicit selects/joins instead.
export const db = drizzle(pool, { schema, mode: "default" });
export type Database = typeof db;
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
