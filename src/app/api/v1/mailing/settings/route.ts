import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { mailingSettings } from "@/db/schema";
import { apiHandler, ok, parseBody } from "@/lib/api";
import { getClientIp, writeAuditLog } from "@/lib/audit";
import { requireRole } from "@/lib/permissions";

const schema = z
  .object({
    paused: z.boolean(),
    dailyCap: z.number().int().min(1).max(10_000),
    perMinute: z.number().int().min(1).max(500),
  })
  .partial();

/** Pause switch and sending pace. */
export const PATCH = apiHandler(async (request) => {
  const session = await requireRole("admin");
  const input = await parseBody(request, schema);
  await db.update(mailingSettings).set(input).where(eq(mailingSettings.id, 1));
  await writeAuditLog({
    actorId: session.user.id,
    action: "mailing.settings_update",
    entityType: "mailing",
    entityId: "settings",
    metadata: input,
    ipAddress: getClientIp(request.headers),
  });
  return ok(input);
});
