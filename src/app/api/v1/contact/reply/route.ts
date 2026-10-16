import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { contactMessages, contactThreads } from "@/db/schema";
import { apiHandler, fail, ok, parseBody } from "@/lib/api";
import { getProxiedClientIp } from "@/lib/audit";
import { notifyContactMessage, senderView } from "@/lib/contact";
import { getCurrentMember } from "@/lib/members";
import { HttpError } from "@/lib/permissions";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  /** A member's conversation… */
  threadId: z.string().max(36).optional(),
  /** …or a visitor's private link. */
  token: z.string().max(100).optional(),
  body: z.string().trim().min(2).max(5000),
});

/** The sender answers in their conversation: it goes back to the committee's "to handle". */
export const POST = apiHandler(async (request) => {
  const input = await parseBody(request, schema);
  const ip = getProxiedClientIp(request.headers) ?? "unknown";
  if (!rateLimit(`contact:reply:${ip}`, 20, 60 * 60 * 1000)) return fail(429, "too_many_requests", "Too many messages. Please try again later.");

  let view: Awaited<ReturnType<typeof senderView>> = null;
  if (input.token) view = await senderView({ token: input.token });
  else if (input.threadId) {
    const member = await getCurrentMember();
    if (!member) throw new HttpError(401, "unauthorized", "Sign in to answer.");
    view = await senderView({ memberId: member.id, id: input.threadId });
  }
  if (!view) throw new HttpError(404, "not_found", "Conversation not found.");

  const messageId = crypto.randomUUID();
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.insert(contactMessages).values({ id: messageId, threadId: view.thread.id, author: "contact", body: input.body, createdAt: now });
    await tx.update(contactThreads).set({ status: "new", lastMessageAt: now }).where(eq(contactThreads.id, view.thread.id));
  });
  await notifyContactMessage({ ...view.thread, status: "new" }, messageId, input.body, false);
  return ok({ id: messageId, createdAt: now.toISOString() }, { status: 201 });
});
