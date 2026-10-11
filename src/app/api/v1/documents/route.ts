import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { documents, type DOCUMENT_VISIBILITIES } from "@/db/schema";
import { apiHandler, ok, parseBody, parseQuery } from "@/lib/api";
import { getClientIp, writeAuditLog } from "@/lib/audit";
import { getSession, requireRole } from "@/lib/permissions";
import { hasRole } from "@/lib/roles";
import { createDocumentSchema, pagination } from "@/lib/validators";

type Visibility = (typeof DOCUMENT_VISIBILITIES)[number];

export const GET = apiHandler(async (request) => {
  const { limit, offset } = parseQuery(request, pagination);
  const role = (await getSession())?.user.role;

  const visible: Visibility[] = hasRole(role, "admin")
    ? ["public", "members", "admins"]
    : hasRole(role, "member")
      ? ["public", "members"]
      : ["public"];

  const rows = await db
    .select()
    .from(documents)
    .where(inArray(documents.visibility, visible))
    .orderBy(desc(documents.createdAt))
    .limit(limit)
    .offset(offset);
  return ok(rows);
});

export const POST = apiHandler(async (request) => {
  const session = await requireRole("admin");
  const input = await parseBody(request, createDocumentSchema);

  const created = await db.transaction(async (tx) => {
    const id = crypto.randomUUID();
    await tx.insert(documents).values({ ...input, id });
    await writeAuditLog(
      {
        actorId: session.user.id,
        action: "document.create",
        entityType: "document",
        entityId: id,
        metadata: { title: input.title, visibility: input.visibility },
        ipAddress: getClientIp(request.headers),
      },
      tx,
    );
    const [row] = await tx.select().from(documents).where(eq(documents.id, id));
    return row;
  });

  return ok(created, { status: 201 });
});
