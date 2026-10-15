import { z } from "zod";
import { apiHandler, ok, parseBody } from "@/lib/api";
import { getClientIp } from "@/lib/audit";
import { recordDues } from "@/lib/dues-record";
import { requireCapability } from "@/lib/permissions";
import { memberIdsSchema } from "@/lib/validators";

/** Several fees at once (the fees page's selection): records or cancels them for the season. */
export const POST = apiHandler(async (request) => {
  const session = await requireCapability("members.write");
  const { ids, paid } = await parseBody(request, memberIdsSchema.extend({ paid: z.boolean() }));
  const result = await recordDues({ memberIds: ids, paid, actorId: session.user.id, ipAddress: getClientIp(request.headers) });
  return ok(result);
});
