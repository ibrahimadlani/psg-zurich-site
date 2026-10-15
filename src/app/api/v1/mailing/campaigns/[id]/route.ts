import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { CAMPAIGN_AUDIENCES, emailCampaigns, emailTemplates } from "@/db/schema";
import { apiHandler, ok, parseBody } from "@/lib/api";
import { HttpError, requireCapability } from "@/lib/permissions";

type Context = RouteContext<"/api/v1/mailing/campaigns/[id]">;

const schema = z.object({
  name: z.string().trim().min(1).max(120),
  audience: z.enum(CAMPAIGN_AUDIENCES),
  audienceEventId: z.string().max(36).nullable(),
  // A page of the site ("/evenements") or a web address.
  ctaUrl: z
    .string()
    .trim()
    .max(255)
    .refine((value) => value === "" || /^\/(?!\/)/.test(value) || /^https?:\/\//.test(value))
    .transform((value) => value || null),
});

/** Campaign settings, while it is a draft or scheduled. */
export const PATCH = apiHandler<Context>(async (request, { params }) => {
  await requireCapability("mailing");
  const { id } = await params;
  const input = await parseBody(request, schema);
  const [result] = await db
    .update(emailCampaigns)
    .set({ ...input, audienceEventId: input.audience === "event" ? input.audienceEventId : null })
    .where(and(eq(emailCampaigns.id, id), inArray(emailCampaigns.status, ["draft", "scheduled"])));
  if (result.affectedRows !== 1) throw new HttpError(409, "locked", "Campaign already sent.");
  return ok({ id });
});

/** Delete a campaign that has not been sent. */
export const DELETE = apiHandler<Context>(async (_request, { params }) => {
  await requireCapability("mailing");
  const { id } = await params;
  const [result] = await db
    .delete(emailCampaigns)
    .where(and(eq(emailCampaigns.id, id), inArray(emailCampaigns.status, ["draft", "scheduled"])));
  if (result.affectedRows !== 1) throw new HttpError(409, "locked", "Campaign already sent.");
  await db.delete(emailTemplates).where(and(eq(emailTemplates.ownerType, "campaign"), eq(emailTemplates.ownerId, id)));
  return ok({ deleted: true });
});
