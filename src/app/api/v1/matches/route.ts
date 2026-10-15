import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { matches } from "@/db/schema";
import { apiHandler, ok, parseBody, parseQuery } from "@/lib/api";
import { getClientIp, writeAuditLog } from "@/lib/audit";
import { scorePredictionsForMatch } from "@/lib/football/sync";
import { manualMatchValues } from "@/lib/matches";
import { requireCapability } from "@/lib/permissions";
import { createMatchSchema, pagination } from "@/lib/validators";

export const GET = apiHandler(async (request) => {
  const { limit, offset } = parseQuery(request, pagination);
  const rows = await db
    .select()
    .from(matches)
    .orderBy(asc(matches.kickoffAt))
    .limit(limit)
    .offset(offset);
  return ok(rows);
});

/** Match entered by hand (cup, friendly…); the football-data.org sync never touches it. */
export const POST = apiHandler(async (request) => {
  const session = await requireCapability("events");
  const input = await parseBody(request, createMatchSchema);

  const id = crypto.randomUUID();
  const created = await db.transaction(async (tx) => {
    await tx.insert(matches).values({ id, ...manualMatchValues(input) });
    await writeAuditLog(
      {
        actorId: session.user.id,
        action: "match.create",
        entityType: "match",
        entityId: id,
        metadata: { opponent: input.opponent, competition: input.competition, kickoffAt: input.kickoffAt },
        ipAddress: getClientIp(request.headers),
      },
      tx,
    );
    const [row] = await tx.select().from(matches).where(eq(matches.id, id));
    return row;
  });
  if (created?.status === "finished") await scorePredictionsForMatch(id);

  return ok(created, { status: 201 });
});
