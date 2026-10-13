import { z } from "zod";
import { CAMPAIGN_AUDIENCES } from "@/db/schema";
import { apiHandler, ok, parseQuery } from "@/lib/api";
import { audienceCount } from "@/lib/mailing/campaigns";
import { requireRole } from "@/lib/permissions";

/** How many members an audience reaches right now (shown live in the editor). */
export const GET = apiHandler(async (request) => {
  await requireRole("admin");
  const { audience, eventId } = parseQuery(
    request,
    z.object({ audience: z.enum(CAMPAIGN_AUDIENCES), eventId: z.string().max(36).optional() }),
  );
  return ok({ count: await audienceCount(audience, eventId ?? null) });
});
