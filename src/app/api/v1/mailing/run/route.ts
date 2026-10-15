import { apiHandler, ok } from "@/lib/api";
import { getClientIp, writeAuditLog } from "@/lib/audit";
import { ensureAutomations } from "@/lib/mailing/queue";
import { runSchedules } from "@/lib/mailing/schedules";
import { processQueue } from "@/lib/mailing/worker";
import { requireCapability } from "@/lib/permissions";

/** "Run now": the periodic scans, then one round of sending (without waiting for the timers). */
export const POST = apiHandler(async (request) => {
  const session = await requireCapability("mailing");
  await ensureAutomations();
  await runSchedules();
  await processQueue();
  await writeAuditLog({
    actorId: session.user.id,
    action: "mailing.run",
    entityType: "mailing",
    entityId: "run",
    ipAddress: getClientIp(request.headers),
  });
  return ok({ done: true });
});
