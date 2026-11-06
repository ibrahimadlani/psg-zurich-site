import { eq } from "drizzle-orm";
import { db } from "@/db";
import { matches } from "@/db/schema";
import { apiHandler, ok, parseBody } from "@/lib/api";
import { getClientIp, writeAuditLog } from "@/lib/audit";
import { HttpError, requireCapability } from "@/lib/permissions";
import { matchPublicSchema } from "@/lib/validators";

/** The committee's additions to a match page: imported matches take them too (sync leaves them alone). */
export const PATCH = apiHandler<{ params: Promise<{ id: string }> }>(async (request, { params }) => {
  const session = await requireCapability("events");
  const { id } = await params;
  const { broadcaster, intro } = await parseBody(request, matchPublicSchema);
  const [row] = await db.select({ id: matches.id }).from(matches).where(eq(matches.id, id));
  if (!row) throw new HttpError(404, "not_found", "Match not found.");
  const written = Object.fromEntries(Object.entries(intro).filter(([, text]) => text));
  await db
    .update(matches)
    .set({ broadcaster: broadcaster || null, intro: Object.keys(written).length ? written : null })
    .where(eq(matches.id, id));
  await writeAuditLog({ actorId: session.user.id, action: "match.public_page", entityType: "match", entityId: id, metadata: { broadcaster: broadcaster || null }, ipAddress: getClientIp(request.headers) });
  return ok({ id });
});
