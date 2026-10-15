import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { pollOptions, pollVotes, polls } from "@/db/schema";
import { apiHandler, ok, parseBody } from "@/lib/api";
import { requireActiveMember } from "@/lib/members";
import { HttpError } from "@/lib/permissions";
import { isVotingOpen, pollsWithResults } from "@/lib/polls";

type Context = RouteContext<"/api/v1/polls/[id]/vote">;

/**
 * An accepted member votes (or changes their vote while the poll is open); returns the poll
 * with its results, shown right after.
 */
export const POST = apiHandler<Context>(async (request, { params }) => {
  const { member } = await requireActiveMember();
  const { id } = await params;
  const { optionId } = await parseBody(request, z.object({ optionId: z.string().min(1).max(36) }));

  const [poll] = await db.select().from(polls).where(eq(polls.id, id));
  if (!poll) throw new HttpError(404, "not_found", "Poll not found.");
  if (!isVotingOpen(poll)) throw new HttpError(409, "closed", "This poll is not open.");
  const [option] = await db.select({ id: pollOptions.id }).from(pollOptions).where(and(eq(pollOptions.id, optionId), eq(pollOptions.pollId, id)));
  if (!option) throw new HttpError(404, "unknown_option", "Unknown option.");

  // One vote per member and poll (unique index): a second one replaces the first.
  await db
    .insert(pollVotes)
    .values({ id: crypto.randomUUID(), pollId: id, optionId, memberId: member.id })
    .onDuplicateKeyUpdate({ set: { optionId } });

  const [result] = await pollsWithResults([poll], member.id);
  return ok(result);
});
