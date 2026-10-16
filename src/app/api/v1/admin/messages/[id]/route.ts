import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { CONTACT_STATUSES, contactThreads } from "@/db/schema";
import { apiHandler, ok, parseBody } from "@/lib/api";
import { getClientIp, writeAuditLog } from "@/lib/audit";
import { formatReference, visibleTopics } from "@/lib/contact";
import { HttpError, requireCapability } from "@/lib/permissions";
import { hasRole } from "@/lib/roles";

type Context = RouteContext<"/api/v1/admin/messages/[id]">;

async function findOrThrow(id: string, role: Parameters<typeof visibleTopics>[0]) {
  const [thread] = await db.select().from(contactThreads).where(eq(contactThreads.id, id));
  if (!thread || !visibleTopics(role).includes(thread.topic)) throw new HttpError(404, "not_found", "Conversation not found.");
  return thread;
}

/** Status (handled, closed, spam…) and who takes it. */
export const PATCH = apiHandler<Context>(async (request, { params }) => {
  const session = await requireCapability("messages");
  const { id } = await params;
  const input = await parseBody(request, z.object({ status: z.enum(CONTACT_STATUSES).optional(), assignedToId: z.string().max(36).nullable().optional() }));
  const thread = await findOrThrow(id, session.user.role);
  await db.transaction(async (tx) => {
    await tx
      .update(contactThreads)
      .set({ ...(input.status ? { status: input.status } : {}), ...(input.assignedToId !== undefined ? { assignedToId: input.assignedToId } : {}) })
      .where(eq(contactThreads.id, id));
    await writeAuditLog(
      {
        actorId: session.user.id,
        action: input.status ? `contact.${input.status}` : "contact.assign",
        entityType: "contact",
        entityId: id,
        metadata: { reference: formatReference(thread.reference), name: thread.name, ...(input.assignedToId !== undefined ? { assignedToId: input.assignedToId } : {}) },
        ipAddress: getClientIp(request.headers),
      },
      tx,
    );
  });
  return ok({ id });
});

/** Deletes the conversation for good (admins). */
export const DELETE = apiHandler<Context>(async (request, { params }) => {
  const session = await requireCapability("messages");
  if (!hasRole(session.user.role, "admin")) throw new HttpError(403, "forbidden", "Admins only.");
  const { id } = await params;
  const thread = await findOrThrow(id, session.user.role);
  await db.transaction(async (tx) => {
    await tx.delete(contactThreads).where(eq(contactThreads.id, id));
    await writeAuditLog(
      { actorId: session.user.id, action: "contact.delete", entityType: "contact", entityId: id, metadata: { reference: formatReference(thread.reference), name: thread.name }, ipAddress: getClientIp(request.headers) },
      tx,
    );
  });
  return ok({ id });
});
