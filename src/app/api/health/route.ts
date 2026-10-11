import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { connection } from "next/server";
import { db } from "@/db";

export async function GET() {
  // Always evaluated at request time, never prerendered.
  await connection();

  let dbStatus: "ok" | "error" = "ok";
  try {
    await db.execute(sql`SELECT 1`);
  } catch (error) {
    dbStatus = "error";
    console.error("[health] database check failed:", error);
  }

  return NextResponse.json(
    {
      status: dbStatus === "ok" ? "ok" : "degraded",
      version: process.env.APP_VERSION || process.env.BUILD_COMMIT,
      db: dbStatus,
      time: new Date().toISOString(),
    },
    {
      status: dbStatus === "ok" ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
