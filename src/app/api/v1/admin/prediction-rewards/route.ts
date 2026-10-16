import { and, eq, lte } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { predictionStandings } from "@/db/schema";
import { apiHandler, ok, parseBody } from "@/lib/api";
import { getClientIp, writeAuditLog } from "@/lib/audit";
import { HttpError, requireCapability } from "@/lib/permissions";

/** Marks the prize of a podium member of a closed season as handed over (or undoes it). */
export const PATCH = apiHandler(async (request) => {
  const session = await requireCapability("events");
  const input = await parseBody(request, z.object({ season: z.number().int(), memberId: z.string().min(1).max(36), given: z.boolean() }));
  const where = and(eq(predictionStandings.season, input.season), eq(predictionStandings.memberId, input.memberId), lte(predictionStandings.rank, 3));
  const [row] = await db.select({ id: predictionStandings.id, rank: predictionStandings.rank }).from(predictionStandings).where(where);
  if (!row) throw new HttpError(404, "not_found", "Not on the podium of this season.");
  await db.transaction(async (tx) => {
    await tx.update(predictionStandings).set({ rewardGivenAt: input.given ? new Date() : null }).where(eq(predictionStandings.id, row.id));
    await writeAuditLog(
      {
        actorId: session.user.id,
        action: input.given ? "prediction.reward" : "prediction.rewardUndo",
        entityType: "member",
        entityId: input.memberId,
        metadata: { season: input.season, rank: row.rank },
        ipAddress: getClientIp(request.headers),
      },
      tx,
    );
  });
  return ok({ given: input.given });
});
