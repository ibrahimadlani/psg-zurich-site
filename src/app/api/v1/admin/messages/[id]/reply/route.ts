import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { contactMessages, contactThreads } from "@/db/schema";
import { apiHandler, ok, parseBody } from "@/lib/api";
import { getClientIp, writeAuditLog } from "@/lib/audit";
import { formatReference, notifyCommitteeReply, visibleTopics } from "@/lib/contact";
import { HttpError, requireCapability } from "@/lib/permissions";

type Context = RouteContext<"/api/v1/admin/messages/[id]/reply">;

/**
 * The committee writes in a conversation: a reply (emailed to the sender, the conversation then
 * waits for them, or is closed at once) or an internal note (never shown to the sender).
 */
export const POST = apiHandler<Context>(async (request, { params }) => {
  const session = await requireCapability("messages");
  const { id } = await params;
  const input = await parseBody(request, z.object({ body: z.string().trim().min(2).max(5000), kind: z.enum(["reply", "note"]), close: z.boolean().optional() }));
  const [thread] = await db.select().from(contactThreads).where(eq(contactThreads.id, id));
  if (!thread || !visibleTopics(session.user.role).includes(thread.topic)) throw new HttpError(404, "not_found", "Conversation not found.");

  const messageId = crypto.randomUUID();
  const now = new Date();
  const reply = input.kind === "reply";
  await db.transaction(async (tx) => {
    await tx.insert(contactMessages).values({ id: messageId, threadId: id, author: reply ? "committee" : "note", authorUserId: session.user.id, body: input.body, createdAt: now });
    await tx
      .update(contactThreads)
      .set(
        reply
          ? { status: input.close ? "closed" : "answered", lastMessageAt: now, firstReplyAt: thread.firstReplyAt ?? now, assignedToId: thread.assignedToId ?? session.user.id }
          : { status: thread.status === "new" ? "open" : thread.status },
      )
      .where(eq(contactThreads.id, id));
    await writeAuditLog(
      { actorId: session.user.id, action: reply ? "contact.reply" : "contact.note", entityType: "contact", entityId: id, metadata: { reference: formatReference(thread.reference), name: thread.name }, ipAddress: getClientIp(request.headers) },
      tx,
    );
  });
  if (reply) await notifyCommitteeReply(thread, messageId, input.body);
  return ok({ id: messageId }, { status: 201 });
});
