import { eq } from "drizzle-orm";
import { db } from "@/db";
import { matches } from "@/db/schema";
import { apiHandler, ok, parseBody } from "@/lib/api";
import { getClientIp, writeAuditLog } from "@/lib/audit";
import { scorePredictionsForMatch } from "@/lib/football/sync";
import { manualMatchValues } from "@/lib/matches";
import { HttpError, requireRole } from "@/lib/permissions";
import { createMatchSchema } from "@/lib/validators";

type Context = RouteContext<"/api/v1/matches/[id]">;

/** Matches imported from football-data.org are kept in sync by the server: only manual ones change here. */
async function findManualOrThrow(id: string) {
  const [row] = await db.select().from(matches).where(eq(matches.id, id));
  if (!row) throw new HttpError(404, "not_found", "Match not found.");
  if (row.externalId !== null) throw new HttpError(409, "synced", "Imported matches are updated automatically.");
  return row;
}

/** Full update (schedule, then score once played). Finishing the match scores the predictions. */
export const PATCH = apiHandler<Context>(async (request, { params }) => {
  const session = await requireRole("admin");
  const { id } = await params;
  const input = await parseBody(request, createMatchSchema);
  await findManualOrThrow(id);

  const updated = await db.transaction(async (tx) => {
    await tx.update(matches).set(manualMatchValues(input)).where(eq(matches.id, id));
    await writeAuditLog(
      {
        actorId: session.user.id,
        action: "match.update",
        entityType: "match",
        entityId: id,
        metadata: { status: input.status, psgScore: input.psgScore ?? null, opponentScore: input.opponentScore ?? null },
        ipAddress: getClientIp(request.headers),
      },
      tx,
    );
    const [row] = await tx.select().from(matches).where(eq(matches.id, id));
    return row;
  });
  if (updated?.status === "finished") await scorePredictionsForMatch(id);
  return ok(updated);
});

/** Removes the match and its predictions; linked events stay, without a match. */
export const DELETE = apiHandler<Context>(async (request, { params }) => {
  const session = await requireRole("admin");
  const { id } = await params;
  const match = await findManualOrThrow(id);

  await db.transaction(async (tx) => {
    await tx.delete(matches).where(eq(matches.id, id));
    await writeAuditLog(
      {
        actorId: session.user.id,
        action: "match.delete",
        entityType: "match",
        entityId: id,
        metadata: { opponent: match.opponent, competition: match.competition },
        ipAddress: getClientIp(request.headers),
      },
      tx,
    );
  });
  return ok({ deleted: true });
});
