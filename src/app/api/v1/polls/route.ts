import { asc, desc, eq, inArray, ne } from "drizzle-orm";
import { db, type Transaction } from "@/db";
import { pollOptions, polls } from "@/db/schema";
import { apiHandler, ok, parseBody, parseQuery } from "@/lib/api";
import { getClientIp, writeAuditLog } from "@/lib/audit";
import { requireCapability, requireRole } from "@/lib/permissions";
import { can } from "@/lib/roles";
import { createPollSchema, pagination } from "@/lib/validators";

type Poll = typeof polls.$inferSelect;

async function withOptions(rows: Poll[], executor: Transaction | typeof db = db) {
  if (rows.length === 0) return [];
  const options = await executor
    .select()
    .from(pollOptions)
    .where(inArray(pollOptions.pollId, rows.map((poll) => poll.id)))
    .orderBy(asc(pollOptions.position));
  return rows.map((poll) => ({
    ...poll,
    options: options.filter((option) => option.pollId === poll.id),
  }));
}

// Polls are a members-only feature; drafts are visible to admins only.
export const GET = apiHandler(async (request) => {
  const session = await requireRole("member");
  const { limit, offset } = parseQuery(request, pagination);
  const rows = await db
    .select()
    .from(polls)
    .where(can(session.user.role, "polls") ? undefined : ne(polls.status, "draft"))
    .orderBy(desc(polls.createdAt))
    .limit(limit)
    .offset(offset);
  return ok(await withOptions(rows));
});

export const POST = apiHandler(async (request) => {
  const session = await requireCapability("polls");
  const { options, ...input } = await parseBody(request, createPollSchema);

  const created = await db.transaction(async (tx) => {
    const id = crypto.randomUUID();
    await tx.insert(polls).values({ ...input, id });
    await tx.insert(pollOptions).values(
      options.map((label, position) => ({ id: crypto.randomUUID(), pollId: id, label, position })),
    );
    await writeAuditLog(
      {
        actorId: session.user.id,
        action: "poll.create",
        entityType: "poll",
        entityId: id,
        metadata: { question: input.question, options: options.length },
        ipAddress: getClientIp(request.headers),
      },
      tx,
    );
    const [poll] = await withOptions(await tx.select().from(polls).where(eq(polls.id, id)), tx);
    return poll;
  });

  return ok(created, { status: 201 });
});
