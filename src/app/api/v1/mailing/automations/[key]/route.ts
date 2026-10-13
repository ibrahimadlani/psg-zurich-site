import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { emailAutomations } from "@/db/schema";
import { apiHandler, ok, parseBody } from "@/lib/api";
import { getClientIp, writeAuditLog } from "@/lib/audit";
import { automation } from "@/lib/mailing/registry";
import { HttpError, requireRole } from "@/lib/permissions";

type Context = RouteContext<"/api/v1/mailing/automations/[key]">;

const schema = z
  .object({ enabled: z.boolean(), delayMinutes: z.number().int().min(0).max(60 * 24 * 60) })
  .partial()
  .refine((input) => Object.keys(input).length > 0);

/** Turn an automation on or off, or change its delay. */
export const PATCH = apiHandler<Context>(async (request, { params }) => {
  const session = await requireRole("admin");
  const { key } = await params;
  if (!automation(key)) throw new HttpError(404, "not_found", "Unknown automation.");
  const input = await parseBody(request, schema);
  await db.update(emailAutomations).set({ ...input, updatedBy: session.user.id }).where(eq(emailAutomations.key, key));
  await writeAuditLog({
    actorId: session.user.id,
    action: "mailing.automation_update",
    entityType: "email_automation",
    entityId: key,
    metadata: input,
    ipAddress: getClientIp(request.headers),
  });
  return ok({ key, ...input });
});
