import { z } from "zod";
import { apiHandler, ok, parseBody } from "@/lib/api";
import { getClientIp, writeAuditLog } from "@/lib/audit";
import { LEGAL } from "@/lib/legal";
import { onFeeReminder, onVerifyReminder } from "@/lib/mailing/triggers";
import { requireCapability } from "@/lib/permissions";
import { memberIdsSchema } from "@/lib/validators";

/**
 * Nudges by email, chosen by the committee: "fee" (the fee is due) or "verify" (confirm the
 * email address). At most one of each per member and day; returns how many were queued.
 */
export const POST = apiHandler(async (request) => {
  const session = await requireCapability("members.write");
  const { ids, kind } = await parseBody(request, memberIdsSchema.extend({ kind: z.enum(["fee", "verify"]) }));
  const queued = kind === "fee" ? await onFeeReminder(ids, LEGAL.statutes.fee) : await onVerifyReminder(ids);
  await writeAuditLog({
    actorId: session.user.id,
    action: kind === "fee" ? "member.fee_reminder" : "member.verify_reminder",
    entityType: "member",
    entityId: ids.length === 1 ? ids[0] : null,
    metadata: { count: ids.length, queued },
    ipAddress: getClientIp(request.headers),
  });
  return ok({ queued });
});
