import { apiHandler, ok, parseBody } from "@/lib/api";
import { getClientIp } from "@/lib/audit";
import { requireCapability } from "@/lib/permissions";
import { saveBroadcasters } from "@/lib/site-settings";
import { broadcastersSchema } from "@/lib/validators";

/** Who shows each competition in Switzerland (empty fields are dropped: nothing is announced). */
export const PUT = apiHandler(async (request) => {
  const session = await requireCapability("roles");
  const input = await parseBody(request, broadcastersSchema);
  const filled = Object.fromEntries(Object.entries(input).filter(([, channel]) => channel));
  await saveBroadcasters(filled, { actorId: session.user.id, ipAddress: getClientIp(request.headers) });
  return ok(filled);
});
