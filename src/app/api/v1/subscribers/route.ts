import { randomBytes } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { subscribers } from "@/db/schema";
import { apiHandler, ok, parseBody, parseQuery } from "@/lib/api";
import { getClientIp, writeAuditLog } from "@/lib/audit";
import { requireRole } from "@/lib/permissions";
import { createSubscriberSchema, pagination } from "@/lib/validators";

const publicColumns = {
  id: subscribers.id,
  email: subscribers.email,
  locale: subscribers.locale,
  status: subscribers.status,
  consentedAt: subscribers.consentedAt,
  createdAt: subscribers.createdAt,
  updatedAt: subscribers.updatedAt,
};

export const GET = apiHandler(async (request) => {
  await requireRole("admin");
  const { limit, offset } = parseQuery(request, pagination);
  const rows = await db
    .select(publicColumns)
    .from(subscribers)
    .orderBy(desc(subscribers.createdAt))
    .limit(limit)
    .offset(offset);
  return ok(rows);
});

export const POST = apiHandler(async (request) => {
  const session = await requireRole("admin");
  const input = await parseBody(request, createSubscriberSchema);

  const created = await db.transaction(async (tx) => {
    const id = crypto.randomUUID();
    await tx.insert(subscribers).values({
      ...input,
      id,
      // Double opt-in: the subscriber still has to confirm.
      confirmationToken: randomBytes(32).toString("hex"),
    });
    await writeAuditLog(
      {
        actorId: session.user.id,
        action: "subscriber.create",
        entityType: "subscriber",
        entityId: id,
        ipAddress: getClientIp(request.headers),
      },
      tx,
    );
    const [row] = await tx.select(publicColumns).from(subscribers).where(eq(subscribers.id, id));
    return row;
  });

  return ok(created, { status: 201 });
});
