import "server-only";
import { and, count, desc, eq, inArray, min } from "drizzle-orm";
import { db } from "@/db";
import { contactMessages, contactThreads, members, user, type Role } from "@/db/schema";
import { MODERATOR_TOPICS, visibleTopics } from "@/lib/contact";

/** "To handle" = nobody opened it yet, or opened and not answered. */
export const TO_HANDLE = ["new", "open"] as const;

/** Conversations of the topics the role may read, newest activity first, with a preview of the last message. */
export async function listInbox(role: Role | null | undefined) {
  const topics = visibleTopics(role);
  if (topics.length === 0) return [];
  const threads = await db
    .select({
      id: contactThreads.id,
      reference: contactThreads.reference,
      topic: contactThreads.topic,
      status: contactThreads.status,
      name: contactThreads.name,
      email: contactThreads.email,
      organisation: contactThreads.organisation,
      memberId: contactThreads.memberId,
      assignedToId: contactThreads.assignedToId,
      lastMessageAt: contactThreads.lastMessageAt,
      image: user.image,
    })
    .from(contactThreads)
    .leftJoin(members, eq(members.id, contactThreads.memberId))
    .leftJoin(user, eq(user.id, members.userId))
    .where(inArray(contactThreads.topic, topics))
    .orderBy(desc(contactThreads.lastMessageAt))
    .limit(500);
  const last = new Map<string, string>();
  if (threads.length) {
    const rows = await db
      .select({ threadId: contactMessages.threadId, body: contactMessages.body })
      .from(contactMessages)
      .where(and(inArray(contactMessages.threadId, threads.map((thread) => thread.id)), inArray(contactMessages.author, ["contact", "committee"])))
      .orderBy(desc(contactMessages.createdAt));
    for (const row of rows) if (!last.has(row.threadId)) last.set(row.threadId, row.body.replace(/\s+/g, " ").slice(0, 160));
  }
  return threads.map((thread) => ({ ...thread, preview: last.get(thread.id) ?? "" }));
}
export type InboxRow = Awaited<ReturnType<typeof listInbox>>[number];

/** One conversation for the committee: every message (notes included), the sender's member file, who can take it. */
export async function inboxDetail(id: string, role: Role | null | undefined) {
  const [thread] = await db.select().from(contactThreads).where(eq(contactThreads.id, id));
  if (!thread || !visibleTopics(role).includes(thread.topic)) return null;
  const [messages, member, team] = await Promise.all([
    db
      .select({
        id: contactMessages.id,
        author: contactMessages.author,
        body: contactMessages.body,
        createdAt: contactMessages.createdAt,
        authorName: user.name,
        authorImage: user.image,
        authorEmail: user.email,
      })
      .from(contactMessages)
      .leftJoin(user, eq(user.id, contactMessages.authorUserId))
      .where(eq(contactMessages.threadId, id))
      .orderBy(contactMessages.createdAt),
    thread.memberId
      ? db
          .select({ id: members.id, status: members.status, memberNumber: members.memberNumber, expiresOn: members.expiresOn, image: user.image })
          .from(members)
          .innerJoin(user, eq(user.id, members.userId))
          .where(eq(members.id, thread.memberId))
          .then((rows) => rows[0] ?? null)
      : null,
    // Who may take it: the committee members who read this topic.
    db
      .select({ id: user.id, name: user.name, email: user.email })
      .from(user)
      .where(inArray(user.role, MODERATOR_TOPICS.includes(thread.topic) ? ["moderator", "admin", "superadmin"] : ["admin", "superadmin"]))
      .orderBy(user.name),
  ]);
  return { thread, messages, member, team };
}

/** How many conversations wait for the committee, and since when the oldest unopened one. */
export async function inboxCounts(role: Role | null | undefined) {
  const topics = visibleTopics(role);
  if (topics.length === 0) return { toHandle: 0, oldestNew: null as Date | null };
  const [row] = await db
    .select({ value: count(), oldest: min(contactThreads.lastMessageAt) })
    .from(contactThreads)
    .where(and(inArray(contactThreads.topic, topics), inArray(contactThreads.status, [...TO_HANDLE])));
  return { toHandle: row?.value ?? 0, oldestNew: row?.oldest ?? null };
}
