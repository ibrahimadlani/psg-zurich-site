import "server-only";
import { and, asc, count, desc, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/db";
import { pollOptions, pollVotes, polls } from "@/db/schema";

type Poll = typeof polls.$inferSelect;

/** A poll members can vote in now: open, and within its dates when it has some. */
export function isVotingOpen(poll: Pick<Poll, "status" | "opensAt" | "closesAt">, now = new Date()) {
  return poll.status === "open" && (!poll.opensAt || poll.opensAt <= now) && (!poll.closesAt || poll.closesAt > now);
}

/** Polls with their options, vote counts and, for a member, the option they picked. */
export async function pollsWithResults(rows: Poll[], memberId: string | null) {
  if (rows.length === 0) return [];
  const ids = rows.map((poll) => poll.id);
  const [options, tally, mine] = await Promise.all([
    db.select().from(pollOptions).where(inArray(pollOptions.pollId, ids)).orderBy(asc(pollOptions.position)),
    db.select({ optionId: pollVotes.optionId, value: count() }).from(pollVotes).where(inArray(pollVotes.pollId, ids)).groupBy(pollVotes.optionId),
    memberId
      ? db.select({ pollId: pollVotes.pollId, optionId: pollVotes.optionId }).from(pollVotes).where(and(inArray(pollVotes.pollId, ids), eq(pollVotes.memberId, memberId)))
      : [],
  ]);
  return rows.map((poll) => {
    const list = options
      .filter((option) => option.pollId === poll.id)
      .map((option) => ({ id: option.id, label: option.label, votes: tally.find((row) => row.optionId === option.id)?.value ?? 0 }));
    return {
      id: poll.id,
      question: poll.question,
      description: poll.description,
      status: poll.status,
      opensAt: poll.opensAt,
      closesAt: poll.closesAt,
      createdAt: poll.createdAt,
      votingOpen: isVotingOpen(poll),
      options: list,
      total: list.reduce((sum, option) => sum + option.votes, 0),
      myOption: mine.find((row) => row.pollId === poll.id)?.optionId ?? null,
    };
  });
}
export type PollView = Awaited<ReturnType<typeof pollsWithResults>>[number];

/** Every poll, for the admin (drafts included), latest first. */
export async function adminPolls() {
  return pollsWithResults(await db.select().from(polls).orderBy(desc(polls.createdAt)), null);
}

/** What a member sees: polls open for voting, and those closed in the last two weeks (results). */
export async function memberPolls(memberId: string) {
  const rows = await db.select().from(polls).where(ne(polls.status, "draft")).orderBy(desc(polls.createdAt)).limit(10);
  const recent = Date.now() - 14 * 24 * 60 * 60 * 1000;
  const relevant = rows.filter((poll) => isVotingOpen(poll) || (poll.closesAt ?? poll.updatedAt).getTime() > recent);
  return pollsWithResults(relevant, memberId);
}
