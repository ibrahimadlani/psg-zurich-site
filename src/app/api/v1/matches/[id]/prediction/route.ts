import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { matches, predictions } from "@/db/schema";
import { apiHandler, ok, parseBody } from "@/lib/api";
import { requireActiveMember } from "@/lib/members";
import { HttpError } from "@/lib/permissions";
import { predictionSchema } from "@/lib/validators";

type Context = RouteContext<"/api/v1/matches/[id]/prediction">;

export const GET = apiHandler<Context>(async (_request, { params }) => {
  const { member } = await requireActiveMember();
  const { id } = await params;
  const [row] = await db
    .select()
    .from(predictions)
    .where(and(eq(predictions.matchId, id), eq(predictions.memberId, member.id)));
  return ok(row ?? null);
});

/** Create or change my prediction, until kick-off. */
export const PUT = apiHandler<Context>(async (request, { params }) => {
  const { member } = await requireActiveMember();
  const { id } = await params;
  const input = await parseBody(request, predictionSchema);

  const [match] = await db.select({ kickoffAt: matches.kickoffAt, status: matches.status }).from(matches).where(eq(matches.id, id));
  if (!match) throw new HttpError(404, "not_found", "Match not found.");
  if (match.status !== "scheduled" || match.kickoffAt.getTime() <= Date.now()) {
    throw new HttpError(409, "closed", "Predictions close at kick-off.");
  }

  await db
    .insert(predictions)
    .values({ id: crypto.randomUUID(), matchId: id, memberId: member.id, ...input })
    .onDuplicateKeyUpdate({ set: input });
  const [row] = await db
    .select()
    .from(predictions)
    .where(and(eq(predictions.matchId, id), eq(predictions.memberId, member.id)));
  return ok(row);
});
