import { z } from "zod";
import { db } from "@/db";
import { CAMPAIGN_AUDIENCES, emailCampaigns } from "@/db/schema";
import { apiHandler, ok, parseBody } from "@/lib/api";
import { requireCapability } from "@/lib/permissions";

/**
 * New campaign (draft): the texts are set in its editor. The audience can come already chosen
 * (from an event: its sign-ups; from the fees page: those who still owe).
 */
export const POST = apiHandler(async (request) => {
  const session = await requireCapability("mailing");
  const { name, audience, audienceEventId } = await parseBody(
    request,
    z.object({
      name: z.string().trim().min(1).max(120),
      audience: z.enum(CAMPAIGN_AUDIENCES).optional(),
      audienceEventId: z.string().max(36).optional(),
    }),
  );
  const id = crypto.randomUUID();
  await db.insert(emailCampaigns).values({
    id,
    name,
    createdBy: session.user.id,
    ...(audience ? { audience, audienceEventId: audience === "event" ? (audienceEventId ?? null) : null } : {}),
  });
  return ok({ id }, { status: 201 });
});
