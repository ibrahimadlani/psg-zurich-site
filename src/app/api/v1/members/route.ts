import { asc, eq, getTableColumns } from "drizzle-orm";
import { db } from "@/db";
import { members, user } from "@/db/schema";
import { apiHandler, ok, parseBody, parseQuery } from "@/lib/api";
import { getClientIp, writeAuditLog } from "@/lib/audit";
import { requireRole } from "@/lib/permissions";
import { createMemberSchema, pagination } from "@/lib/validators";

// Personal data: admins only, for reading too.
export const GET = apiHandler(async (request) => {
  await requireRole("admin");
  const { limit, offset } = parseQuery(request, pagination);
  const rows = await db
    .select({ ...getTableColumns(members), email: user.email })
    .from(members)
    .innerJoin(user, eq(user.id, members.userId))
    .orderBy(asc(members.lastName), asc(members.firstName))
    .limit(limit)
    .offset(offset);
  return ok(rows);
});

export const POST = apiHandler(async (request) => {
  const session = await requireRole("admin");
  const input = await parseBody(request, createMemberSchema);

  const created = await db.transaction(async (tx) => {
    const id = crypto.randomUUID();
    await tx.insert(members).values({ ...input, id });
    await writeAuditLog(
      {
        actorId: session.user.id,
        action: "member.create",
        entityType: "member",
        entityId: id,
        metadata: { userId: input.userId, status: input.status },
        ipAddress: getClientIp(request.headers),
      },
      tx,
    );
    const [row] = await tx.select().from(members).where(eq(members.id, id));
    return row;
  });

  return ok(created, { status: 201 });
});
