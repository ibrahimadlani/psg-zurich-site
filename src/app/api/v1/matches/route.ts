import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { matches } from "@/db/schema";
import { apiHandler, ok, parseBody, parseQuery } from "@/lib/api";
import { getClientIp, writeAuditLog } from "@/lib/audit";
import { requireRole } from "@/lib/permissions";
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

export const POST = apiHandler(async (request) => {
  const session = await requireRole("admin");
  const input = await parseBody(request, createMatchSchema);

  const created = await db.transaction(async (tx) => {
    const id = crypto.randomUUID();
    await tx.insert(matches).values({ ...input, id });
    await writeAuditLog(
      {
        actorId: session.user.id,
        action: "match.create",
        entityType: "match",
        entityId: id,
        metadata: { opponent: input.opponent, kickoffAt: input.kickoffAt },
        ipAddress: getClientIp(request.headers),
      },
      tx,
    );
    const [row] = await tx.select().from(matches).where(eq(matches.id, id));
    return row;
  });

  return ok(created, { status: 201 });
});
