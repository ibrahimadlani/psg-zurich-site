import "server-only";
import { and, between, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { matches } from "@/db/schema";
import { isFootballApiConfigured } from "@/lib/football/api";
import { syncFixture, syncSeason } from "@/lib/football/sync";

const MINUTE = 60_000;
const SEASON_EVERY = 6 * 60 * MINUTE;
const LIVE_EVERY = 3 * MINUTE;
// Poll from 15 min before kick-off to 3 h after (extra time, penalties, delays).
const WINDOW_BEFORE = 15 * MINUTE;
const WINDOW_AFTER = 3 * 60 * MINUTE;

let started = false;
let running = false;
let lastSeasonSync = 0;
const lastFixtureSync = new Map<number, number>();

async function tick() {
  if (running) return;
  running = true;
  const now = Date.now();
  try {
    if (now - lastSeasonSync >= SEASON_EVERY) {
      lastSeasonSync = now;
      const count = await syncSeason();
      console.log(`[football] season synced (${count} fixtures)`);
    }

    // Matches around now that are not over yet: follow them live.
    const current = await db
      .select({ externalId: matches.externalId })
      .from(matches)
      .where(
        and(
          isNotNull(matches.externalId),
          inArray(matches.status, ["scheduled", "live"]),
          between(matches.kickoffAt, new Date(now - WINDOW_AFTER), new Date(now + WINDOW_BEFORE)),
        ),
      );
    for (const { externalId } of current) {
      if (externalId === null || now - (lastFixtureSync.get(externalId) ?? 0) < LIVE_EVERY) continue;
      lastFixtureSync.set(externalId, now);
      await syncFixture(externalId);
    }
  } catch (error) {
    console.error("[football] sync failed:", error);
  } finally {
    running = false;
  }
}

/** Keeps PSG fixtures up to date while the server runs (single Node process). */
export function startFootballSync() {
  if (started || !isFootballApiConfigured()) return;
  started = true;
  void tick();
  setInterval(() => void tick(), MINUTE).unref();
}
