import "server-only";
import { createHash, createHmac } from "node:crypto";
import { and, desc, eq, gt, inArray, isNotNull, isNull, max, or } from "drizzle-orm";
import { db } from "@/db";
import {
  CONTACT_TOPICS,
  contactMessages,
  contactThreads,
  members,
  user,
  type ContactTopic,
  type Locale,
  type Role,
} from "@/db/schema";
import { LEGAL } from "@/lib/legal";
import { enqueue, siteUrl, type Recipient } from "@/lib/mailing/queue";
import { hasRole } from "@/lib/roles";

/*
 * Contact messages: a conversation per request, read by the committee in admin › Messages.
 * Admins see every topic; moderators only the ones about club life and the website, never
 * fees, partnerships or personal data.
 */

export const MODERATOR_TOPICS: readonly ContactTopic[] = ["events", "website"];

/** Topics a committee role may read and answer (none below moderator). */
export function visibleTopics(role: Role | null | undefined): ContactTopic[] {
  if (hasRole(role, "admin")) return [...CONTACT_TOPICS];
  if (hasRole(role, "moderator")) return [...MODERATOR_TOPICS];
  return [];
}

/** "C-0042". */
export const formatReference = (reference: number) => `C-${String(reference).padStart(4, "0")}`;

/** A visitor's private follow-up link, derived from the conversation (never stored as such). */
export const trackingToken = (threadId: string) =>
  createHmac("sha256", process.env.BETTER_AUTH_SECRET ?? "").update(`contact:${threadId}`).digest("base64url");
export const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");

/** Links in a text: more than a few in a first message from a visitor is how spam looks. */
export const countLinks = (text: string) => (text.match(/https?:\/\/|www\./gi) ?? []).length;
export const MAX_VISITOR_LINKS = 3;

type Thread = typeof contactThreads.$inferSelect;

/** Where the sender reads the conversation: the member area, or the visitor's private link. */
export function senderLink(thread: Pick<Thread, "id" | "memberId" | "locale">) {
  return thread.memberId
    ? { path: `/espace-membre/messages/${thread.id}` }
    : { url: `${siteUrl()}/${thread.locale}/contact/suivi/${trackingToken(thread.id)}` };
}

const isDuplicate = (error: unknown): boolean =>
  typeof error === "object" && error !== null && "cause" in error
    ? isDuplicate((error as { cause: unknown }).cause)
    : (error as { code?: string } | null)?.code === "ER_DUP_ENTRY";

/** Opens a conversation with its first message; the reference is the next free number. */
export async function createThread(input: {
  topic: ContactTopic;
  name: string;
  email: string;
  locale: Locale;
  organisation?: string | null;
  context?: { page?: string; userAgent?: string } | null;
  memberId: string | null;
  body: string;
  spam: boolean;
}) {
  for (let attempt = 0; ; attempt++) {
    const id = crypto.randomUUID();
    try {
      return await db.transaction(async (tx) => {
        const [last] = await tx.select({ value: max(contactThreads.reference) }).from(contactThreads);
        const reference = (last?.value ?? 0) + 1;
        const now = new Date();
        await tx.insert(contactThreads).values({
          id,
          reference,
          topic: input.topic,
          status: input.spam ? "spam" : "new",
          memberId: input.memberId,
          name: input.name,
          email: input.email,
          locale: input.locale,
          organisation: input.organisation || null,
          context: input.context ?? null,
          trackingTokenHash: input.memberId ? null : tokenHash(trackingToken(id)),
          lastMessageAt: now,
        });
        const messageId = crypto.randomUUID();
        await tx.insert(contactMessages).values({ id: messageId, threadId: id, author: "contact", body: input.body });
        const [thread] = await tx.select().from(contactThreads).where(eq(contactThreads.id, id));
        return { thread: thread!, messageId };
      });
    } catch (error) {
      // Two messages sent at the same instant got the same number: take the next one.
      if (attempt < 3 && isDuplicate(error)) continue;
      throw error;
    }
  }
}

/** The committee members who read a topic, plus the club mailbox (it keeps a copy of everything). */
export async function topicReaders(topic: ContactTopic): Promise<Recipient[]> {
  const roles: Role[] = MODERATOR_TOPICS.includes(topic) ? ["admin", "superadmin", "moderator"] : ["admin", "superadmin"];
  const rows = await db
    .select({ email: user.email, memberId: members.id, locale: members.locale, firstName: members.firstName })
    .from(user)
    .leftJoin(members, eq(members.userId, user.id))
    .where(inArray(user.role, roles));
  const recipients = new Map<string, Recipient>();
  recipients.set(LEGAL.email.toLowerCase(), { memberId: null, email: LEGAL.email, locale: "fr", firstName: "" });
  for (const row of rows) {
    const key = row.email.toLowerCase();
    if (!recipients.has(key)) recipients.set(key, { memberId: null, email: row.email, locale: row.locale ?? "fr", firstName: row.firstName ?? "" });
  }
  return [...recipients.values()];
}

const sender = (thread: Thread): Recipient => ({
  memberId: thread.memberId,
  email: thread.email,
  locale: thread.locale,
  firstName: thread.name.split(/\s+/)[0] ?? "",
});

/**
 * A message arrived from the sender: an acknowledgement for a new conversation, and the
 * alert to the committee (answers by email go straight to the sender). Nothing for spam.
 */
export async function notifyContactMessage(thread: Thread, messageId: string, body: string, first: boolean) {
  if (thread.status === "spam") return;
  const reference = formatReference(thread.reference);
  if (first) {
    await enqueue("contact.received", [sender(thread)], () => ({
      values: { reference, topic: thread.topic },
      ...senderLink(thread),
      quote: body,
      dedupe: `contact.received:${thread.id}`,
    }));
  }
  await enqueue("contact.toCommittee", await topicReaders(thread.topic), (recipient) => ({
    values: {
      reference,
      topic: thread.topic,
      name: thread.name,
      email: thread.email,
      organisation: thread.organisation ?? "",
      followUp: first ? "no" : "yes",
    },
    path: `/admin/messages/${thread.id}`,
    quote: body,
    replyTo: thread.email,
    dedupe: `contact.toCommittee:${messageId}:${recipient.email.toLowerCase()}`,
  }));
}

/** The committee answered: the sender gets the reply by email, with the way back to the conversation. */
export async function notifyCommitteeReply(thread: Thread, messageId: string, body: string) {
  await enqueue("contact.reply", [sender(thread)], () => ({
    values: { reference: formatReference(thread.reference), topic: thread.topic },
    ...senderLink(thread),
    quote: body,
    dedupe: `contact.reply:${messageId}`,
  }));
}

/** Conversations of a member, newest first (for the member area and the contact page). */
export async function memberThreads(memberId: string) {
  return db
    .select({
      id: contactThreads.id,
      reference: contactThreads.reference,
      topic: contactThreads.topic,
      status: contactThreads.status,
      lastMessageAt: contactThreads.lastMessageAt,
      createdAt: contactThreads.createdAt,
    })
    .from(contactThreads)
    .where(eq(contactThreads.memberId, memberId))
    .orderBy(desc(contactThreads.lastMessageAt));
}

/** A conversation as its sender sees it (internal notes left out). */
export async function senderView(where: { memberId: string; id: string } | { token: string }) {
  const [thread] = await db
    .select()
    .from(contactThreads)
    .where(
      "token" in where
        ? eq(contactThreads.trackingTokenHash, tokenHash(where.token))
        : and(eq(contactThreads.id, where.id), eq(contactThreads.memberId, where.memberId)),
    );
  if (!thread || thread.status === "spam") return null;
  const messages = await db
    .select({ id: contactMessages.id, author: contactMessages.author, body: contactMessages.body, createdAt: contactMessages.createdAt, authorName: members.firstName })
    .from(contactMessages)
    .leftJoin(members, eq(members.userId, contactMessages.authorUserId))
    .where(and(eq(contactMessages.threadId, thread.id), inArray(contactMessages.author, ["contact", "committee"])))
    .orderBy(contactMessages.createdAt);
  return { thread, messages };
}

/** The committee as shown on the contact page: those with a role title, photo and first name only. */
export async function committeeMembers() {
  const rows = await db
    .select({ id: members.id, firstName: members.firstName, title: members.committeeTitle, image: user.image, email: user.email, role: user.role })
    .from(members)
    .innerJoin(user, eq(user.id, members.userId))
    .where(and(isNotNull(members.committeeTitle), inArray(user.role, ["moderator", "admin", "superadmin"])));
  // Superadmins first, then admins, moderators; by first name within a role.
  const order: Record<string, number> = { superadmin: 0, admin: 1, moderator: 2 };
  return rows
    .filter((row) => row.title?.trim())
    .sort((a, b) => (order[a.role] ?? 3) - (order[b.role] ?? 3) || a.firstName.localeCompare(b.firstName))
    .map(({ role: _role, ...row }) => row);
}

/** The member's conversations with a committee reply they haven't opened yet. */
export async function unreadThreadIds(memberId: string) {
  const rows = await db
    .selectDistinct({ id: contactThreads.id })
    .from(contactMessages)
    .innerJoin(contactThreads, eq(contactThreads.id, contactMessages.threadId))
    .where(
      and(
        eq(contactThreads.memberId, memberId),
        eq(contactMessages.author, "committee"),
        or(isNull(contactThreads.senderSeenAt), gt(contactMessages.createdAt, contactThreads.senderSeenAt)),
      ),
    );
  return new Set(rows.map((row) => row.id));
}

/** The sender opened the conversation: its replies are no longer new. */
export async function markSeenBySender(threadId: string) {
  await db.update(contactThreads).set({ senderSeenAt: new Date() }).where(eq(contactThreads.id, threadId));
}
