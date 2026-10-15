import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { emailCampaigns, emailTemplates } from "@/db/schema";
import { apiHandler, ok, parseBody } from "@/lib/api";
import { getClientIp, writeAuditLog } from "@/lib/audit";
import { launchCampaign } from "@/lib/mailing/campaigns";
import { HttpError, requireCapability } from "@/lib/permissions";

type Context = RouteContext<"/api/v1/mailing/campaigns/[id]/send">;

/** Send now, schedule (`at`), or take a scheduled campaign back to draft (`at: null`). */
export const POST = apiHandler<Context>(async (request, { params }) => {
  const session = await requireCapability("mailing");
  const { id } = await params;
  const { at } = await parseBody(request, z.object({ at: z.iso.datetime({ offset: true }).nullable().optional() }));
  const [template] = await db
    .select({ id: emailTemplates.id })
    .from(emailTemplates)
    .where(and(eq(emailTemplates.ownerType, "campaign"), eq(emailTemplates.ownerId, id)));
  if (!template) throw new HttpError(409, "no_texts", "Write the email before sending it.");

  const editable = and(eq(emailCampaigns.id, id), inArray(emailCampaigns.status, ["draft", "scheduled"]));
  let queued = 0;
  if (at === null) {
    await db.update(emailCampaigns).set({ status: "draft", scheduledAt: null }).where(editable);
  } else if (at && new Date(at).getTime() > Date.now()) {
    await db.update(emailCampaigns).set({ status: "scheduled", scheduledAt: new Date(at) }).where(editable);
  } else {
    queued = await launchCampaign(id);
  }
  await writeAuditLog({
    actorId: session.user.id,
    action: at === null ? "mailing.campaign_unschedule" : at ? "mailing.campaign_schedule" : "mailing.campaign_send",
    entityType: "email_campaign",
    entityId: id,
    metadata: { at: at ?? null, queued },
    ipAddress: getClientIp(request.headers),
  });
  return ok({ queued });
});
