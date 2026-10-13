import "server-only";
import { and, count, eq, gte, inArray, isNull, lt, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { attendance, emailCampaigns, emailJobs, members, user, type CAMPAIGN_AUDIENCES } from "@/db/schema";
import { todayInZurich } from "@/lib/dues";

export type CampaignAudience = (typeof CAMPAIGN_AUDIENCES)[number];

/**
 * Members a campaign goes to: always those who keep "club news" on.
 * members: accepted · paid: fee paid · unpaid: accepted, fee due · pending: awaiting the
 * committee · event: signed up for one event.
 */
export function audienceWhere(audience: CampaignAudience, eventId: string | null): SQL {
  const today = todayInZurich();
  const base = eq(members.notifyNews, true);
  switch (audience) {
    case "paid":
      return and(base, eq(members.status, "active"), gte(members.expiresOn, today))!;
    case "unpaid":
      return and(base, eq(members.status, "active"), or(isNull(members.expiresOn), lt(members.expiresOn, today)))!;
    case "pending":
      return and(base, eq(members.status, "pending"))!;
    case "event": {
      const signedUp = db
        .select({ memberId: attendance.memberId })
        .from(attendance)
        .where(and(eq(attendance.eventId, eventId ?? ""), eq(attendance.status, "registered")));
      return and(base, inArray(members.id, signedUp))!;
    }
    default:
      return and(base, eq(members.status, "active"))!;
  }
}

export async function audienceCount(audience: CampaignAudience, eventId: string | null) {
  const [row] = await db.select({ value: count() }).from(members).where(audienceWhere(audience, eventId));
  return row?.value ?? 0;
}

/** Queues one email per member of the audience and marks the campaign as sending. */
export async function launchCampaign(campaignId: string) {
  const [campaign] = await db.select().from(emailCampaigns).where(eq(emailCampaigns.id, campaignId));
  if (!campaign || campaign.status === "sending" || campaign.status === "sent") return 0;
  const recipients = await db
    .select({ memberId: members.id, email: user.email, locale: members.locale, firstName: members.firstName })
    .from(members)
    .innerJoin(user, eq(user.id, members.userId))
    .where(audienceWhere(campaign.audience, campaign.audienceEventId));
  const now = new Date();
  if (recipients.length > 0) {
    await db
      .insert(emailJobs)
      .values(
        recipients.map((recipient) => ({
          campaignId,
          memberId: recipient.memberId,
          toEmail: recipient.email,
          locale: recipient.locale,
          payload: { values: { firstName: recipient.firstName } },
          dedupeKey: `campaign:${campaignId}:${recipient.memberId}`,
          sendAfter: now,
        })),
      )
      .onDuplicateKeyUpdate({ set: { campaignId } });
  }
  await db
    .update(emailCampaigns)
    .set({ status: recipients.length > 0 ? "sending" : "sent", sentCount: 0, scheduledAt: campaign.scheduledAt ?? now })
    .where(eq(emailCampaigns.id, campaignId));
  return recipients.length;
}

/** Scheduled campaigns whose time has come (called by the periodic scan). */
export async function launchScheduledCampaigns() {
  const due = await db
    .select({ id: emailCampaigns.id, at: emailCampaigns.scheduledAt })
    .from(emailCampaigns)
    .where(eq(emailCampaigns.status, "scheduled"));
  for (const campaign of due) if (campaign.at && campaign.at.getTime() <= Date.now()) await launchCampaign(campaign.id);
}
