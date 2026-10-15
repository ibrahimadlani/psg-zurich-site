import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { POLL_STATUSES, polls } from "@/db/schema";
import { apiHandler, ok, parseBody } from "@/lib/api";
import { getClientIp, writeAuditLog } from "@/lib/audit";
import { HttpError, requireCapability } from "@/lib/permissions";

type Context = RouteContext<"/api/v1/polls/[id]">;

async function findOrThrow(id: string) {
  const [row] = await db.select({ id: polls.id, question: polls.question }).from(polls).where(eq(polls.id, id));
  if (!row) throw new HttpError(404, "not_found", "Poll not found.");
  return row;
}

/** Open, close or put back in draft; the closing date can change too (null: no end). */
export const PATCH = apiHandler<Context>(async (request, { params }) => {
  const session = await requireCapability("polls");
  const { id } = await params;
  const input = await parseBody(
    request,
    z.object({
      status: z.enum(POLL_STATUSES),
      closesAt: z.iso.datetime({ offset: true }).transform((value) => new Date(value)).nullable().optional(),
    }),
  );
  await findOrThrow(id);
  await db.transaction(async (tx) => {
    await tx
      .update(polls)
      .set({ status: input.status, ...(input.closesAt !== undefined ? { closesAt: input.closesAt } : {}) })
      .where(eq(polls.id, id));
    await writeAuditLog(
      { actorId: session.user.id, action: `poll.${input.status}`, entityType: "poll", entityId: id, ipAddress: getClientIp(request.headers) },
      tx,
    );
  });
  return ok({ id, status: input.status });
});

/** Deletes the poll with its options and votes. */
export const DELETE = apiHandler<Context>(async (request, { params }) => {
  const session = await requireCapability("polls");
  const { id } = await params;
  const poll = await findOrThrow(id);
  await db.transaction(async (tx) => {
    await tx.delete(polls).where(eq(polls.id, id));
    await writeAuditLog(
      { actorId: session.user.id, action: "poll.delete", entityType: "poll", entityId: id, metadata: { question: poll.question }, ipAddress: getClientIp(request.headers) },
      tx,
    );
  });
  return ok({ deleted: true });
});
