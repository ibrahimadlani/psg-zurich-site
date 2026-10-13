import "server-only";
import { and, count, desc, eq, gte, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { EMAIL_JOB_STATUSES, emailAutomations, emailCampaigns, emailJobs, emailTemplates, type EmailJobStatus, type Locale } from "@/db/schema";
import { loadMessages } from "@/i18n/messages";
import { requireRole } from "@/lib/permissions";
import { AUTOMATIONS, automation } from "@/lib/mailing/registry";
import { ensureAutomations } from "@/lib/mailing/queue";

export async function requireMailingAdmin() {
  try {
    return await requireRole("admin");
  } catch {
    return null;
  }
}

/** Each automation with its settings and the number of emails sent in 30 days. */
export async function automationsOverview() {
  await ensureAutomations();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [settings, sent] = await Promise.all([
    db.select().from(emailAutomations),
    db
      .select({ key: emailJobs.automationKey, value: count() })
      .from(emailJobs)
      .where(and(eq(emailJobs.status, "sent"), gte(emailJobs.sentAt, since), isNotNull(emailJobs.automationKey)))
      .groupBy(emailJobs.automationKey),
  ]);
  const byKey = new Map(settings.map((row) => [row.key, row]));
  const counts = new Map(sent.map((row) => [row.key, row.value]));
  return AUTOMATIONS.map((item) => ({
    ...item,
    enabled: byKey.get(item.key)?.enabled ?? true,
    delayMinutes: byKey.get(item.key)?.delayMinutes ?? item.delay,
    sent30: counts.get(item.key) ?? 0,
  }));
}

type Fields = { subject: string; preview: string; heading: string; body: string; ctaLabel: string };

/** Saved texts of an automation or a campaign, per language. */
export async function savedTemplates(ownerType: "automation" | "campaign", ownerId: string) {
  const rows = await db
    .select()
    .from(emailTemplates)
    .where(and(eq(emailTemplates.ownerType, ownerType), eq(emailTemplates.ownerId, ownerId)));
  return Object.fromEntries(
    rows.map((row) => [row.locale, { subject: row.subject, preview: row.preview, heading: row.heading, body: row.body, ctaLabel: row.ctaLabel ?? "" }]),
  ) as Partial<Record<Locale, Fields>>;
}

/** Default texts of an automation, per language (placeholders of the editor). */
export async function defaultTemplates(key: string) {
  const definition = automation(key);
  if (!definition) return {};
  const result: Partial<Record<Locale, Partial<Fields>>> = {};
  for (const locale of ["fr", "en", "de"] as const) {
    const raw = ((await loadMessages(locale)).Emails as Record<string, Record<string, string>>)[definition.messages] ?? {};
    result[locale] = { subject: raw.subject, preview: raw.preview, heading: raw.heading, body: raw.body, ctaLabel: raw.cta };
  }
  return result;
}

export const campaignsList = () => db.select().from(emailCampaigns).orderBy(desc(emailCampaigns.createdAt)).limit(50);

/** Latest 100 emails of the log, optionally of one status. */
export async function journal(status: string | undefined) {
  const filter = (EMAIL_JOB_STATUSES as readonly string[]).includes(status ?? "") ? (status as EmailJobStatus) : undefined;
  return db
    .select({
      id: emailJobs.id,
      automationKey: emailJobs.automationKey,
      campaignName: emailCampaigns.name,
      toEmail: emailJobs.toEmail,
      status: emailJobs.status,
      lastError: emailJobs.lastError,
      sendAfter: emailJobs.sendAfter,
      sentAt: emailJobs.sentAt,
      createdAt: emailJobs.createdAt,
    })
    .from(emailJobs)
    .leftJoin(emailCampaigns, eq(emailCampaigns.id, emailJobs.campaignId))
    .where(filter ? eq(emailJobs.status, filter) : undefined)
    .orderBy(desc(emailJobs.createdAt))
    .limit(100);
}

/** Message key of an automation's name in the admin ("fee.reminder" → "fee_reminder"). */
export const automationMessageKey = (key: string) => key.replace(/\./g, "_");
