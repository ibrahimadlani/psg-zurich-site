import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { CONTACT_TOPICS, LOCALES, user } from "@/db/schema";
import { apiHandler, fail, ok, parseBody } from "@/lib/api";
import { getProxiedClientIp } from "@/lib/audit";
import { countLinks, createThread, formatReference, MAX_VISITOR_LINKS, notifyContactMessage, senderLink } from "@/lib/contact";
import { getCurrentMember } from "@/lib/members";
import { getSession } from "@/lib/permissions";
import { rateLimit } from "@/lib/rate-limit";

const HOUR = 60 * 60 * 1000;
/** A person needs more than this to read the page and type a message. */
const MIN_FILL_MS = 3000;

const schema = z.object({
  topic: z.enum(CONTACT_TOPICS),
  // Taken from the session when signed in.
  name: z.string().trim().min(2).max(120).optional(),
  email: z.email().trim().toLowerCase().max(255).optional(),
  organisation: z.string().trim().max(160).optional(),
  body: z.string().trim().min(20).max(5000),
  locale: z.enum(LOCALES),
  /** Website problems: the page the sender was on. */
  page: z.string().trim().max(500).optional(),
  /** When the form was shown (ms), against robots that post at once. */
  startedAt: z.number().int(),
  /** Hidden field: only robots fill it. */
  website: z.string().optional(),
});

/** A message from the contact page: opens a conversation, acknowledges it, alerts the committee. */
export const POST = apiHandler(async (request) => {
  const input = await parseBody(request, schema);
  // Robot: same answer as a real message, nothing stored or sent.
  if (input.website) return ok({ reference: formatReference(0), follow: null }, { status: 201 });
  if (Date.now() - input.startedAt < MIN_FILL_MS) return fail(400, "too_fast", "Sent too fast.");

  const [session, member] = await Promise.all([getSession(), getCurrentMember()]);
  let name = input.name;
  let email = input.email;
  if (session) {
    const [account] = await db.select({ email: user.email, name: user.name }).from(user).where(eq(user.id, session.user.id));
    email = account?.email ?? session.user.email;
    name = member ? `${member.firstName} ${member.lastName}`.trim() : account?.name || name;
  }
  if (!name || !email) return fail(400, "missing_identity", "Name and email are required.");

  const ip = getProxiedClientIp(request.headers) ?? "unknown";
  if (!rateLimit(`contact:ip:${ip}`, 5, HOUR) || !rateLimit(`contact:email:${email}`, 3, HOUR)) {
    return fail(429, "too_many_requests", "Too many messages. Please try again later.");
  }

  const memberId = member?.id ?? null;
  const { thread, messageId } = await createThread({
    topic: input.topic,
    name,
    email,
    locale: input.locale,
    organisation: input.topic === "partnership" ? input.organisation : null,
    context: input.topic === "website" ? { page: input.page, userAgent: request.headers.get("user-agent")?.slice(0, 300) } : null,
    memberId,
    body: input.body,
    // A first message full of links from someone we don't know: kept aside, nobody alerted.
    spam: !memberId && countLinks(input.body) > MAX_VISITOR_LINKS,
  });
  await notifyContactMessage(thread, messageId, input.body, true);
  const link = senderLink(thread);
  return ok({ reference: formatReference(thread.reference), follow: "url" in link ? link.url : link.path }, { status: 201 });
});
