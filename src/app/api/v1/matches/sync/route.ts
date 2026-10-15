import { and, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { matches } from "@/db/schema";
import { apiHandler, fail, ok } from "@/lib/api";
import { getClientIp, writeAuditLog } from "@/lib/audit";
import { FootballApiError, isFootballApiConfigured } from "@/lib/football/api";
import { syncMatch, syncSeason } from "@/lib/football/sync";
import { requireCapability } from "@/lib/permissions";

/** Admin "Sync now": the season, then any match in progress. */
export const POST = apiHandler(async (request) => {
  const session = await requireCapability("events");
  if (!isFootballApiConfigured()) return fail(503, "not_configured", "FOOTBALL_DATA_KEY is not set.");

  try {
    const count = await syncSeason();
    const live = await db
      .select({ externalId: matches.externalId })
      .from(matches)
      .where(and(isNotNull(matches.externalId), inArray(matches.status, ["live"])));
    for (const { externalId } of live) if (externalId !== null) await syncMatch(externalId);

    await writeAuditLog({
      actorId: session.user.id,
      action: "match.sync",
      entityType: "match",
      metadata: { matches: count },
      ipAddress: getClientIp(request.headers),
    });
    return ok({ fixtures: count });
  } catch (error) {
    if (error instanceof FootballApiError) return fail(502, "football_api", error.message);
    throw error;
  }
});
