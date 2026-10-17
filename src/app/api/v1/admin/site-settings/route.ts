import { z } from "zod";
import { HOME_MEMBER_VARIANTS, HOME_VISITOR_VARIANTS } from "@/db/schema";
import { apiHandler, ok, parseBody } from "@/lib/api";
import { getClientIp } from "@/lib/audit";
import { requireCapability } from "@/lib/permissions";
import { saveHomeSettings } from "@/lib/site-settings";

/** The home page shown to visitors and to signed-in members. */
export const PUT = apiHandler(async (request) => {
  const session = await requireCapability("roles");
  const input = await parseBody(request, z.object({ visitor: z.enum(HOME_VISITOR_VARIANTS), member: z.enum(HOME_MEMBER_VARIANTS) }));
  await saveHomeSettings(input, { actorId: session.user.id, ipAddress: getClientIp(request.headers) });
  return ok(input);
});
