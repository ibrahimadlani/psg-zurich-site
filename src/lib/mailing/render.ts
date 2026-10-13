import "server-only";
import { and, eq } from "drizzle-orm";
import { createTranslator } from "next-intl";
import { createElement } from "react";
import { db } from "@/db";
import { emailCampaigns, emailJobs, emailTemplates, type Locale } from "@/db/schema";
import { ClubEmail } from "@/emails/club-email";
import { loadMessages } from "@/i18n/messages";
import { LEGAL } from "@/lib/legal";
import { automation, type MailCategory } from "@/lib/mailing/registry";
import { siteUrl } from "@/lib/mailing/queue";
import { unsubscribeUrl, type NotificationType } from "@/lib/unsubscribe";

type Job = typeof emailJobs.$inferSelect;
export type Texts = { subject: string; preview: string; heading: string; body: string; cta?: string; footer?: string };
/** Raw texts (with {variables}, ICU plurals, <mail></mail>), before formatting. */
type Raw = Partial<Record<keyof Texts, string>>;
type Fields = { subject: string; preview: string; heading: string; body: string; ctaLabel?: string | null };

/** Texts edited by the committee, in this language (campaigns fall back to any language). */
async function editedTexts(ownerType: "automation" | "campaign", ownerId: string, locale: Locale) {
  const rows = await db
    .select()
    .from(emailTemplates)
    .where(and(eq(emailTemplates.ownerType, ownerType), eq(emailTemplates.ownerId, ownerId)));
  return rows.find((row) => row.locale === locale) ?? (ownerType === "campaign" ? (rows.find((row) => row.locale === "fr") ?? rows[0]) : undefined);
}

/** Default raw texts of an automation (messages › Emails.<namespace>). */
async function defaultRaw(namespace: string, locale: Locale): Promise<Raw> {
  const emails = (await loadMessages(locale)).Emails as Record<string, Raw>;
  return emails[namespace] ?? {};
}

/** Edited fields over the defaults: an empty field keeps the default text. */
function merge(defaults: Raw, edited?: Fields | null): Raw {
  if (!edited) return defaults;
  return {
    ...defaults,
    subject: edited.subject || defaults.subject,
    preview: edited.preview || defaults.preview,
    heading: edited.heading || defaults.heading,
    body: edited.body || defaults.body,
    cta: edited.ctaLabel || defaults.cta,
  };
}

/**
 * {variables}, ICU plurals and <mail></mail> (link to the club address), for default and
 * edited texts alike. A text the formatter can't read (stray brace) is shown as written.
 */
function format(raw: Raw, locale: Locale, values: Record<string, string>): Texts {
  const icu = Object.fromEntries(
    Object.entries({ email: LEGAL.email, ...values }).map(([key, value]) => [key, /^-?\d+$/.test(value) ? Number(value) : value]),
  );
  const tags = { mail: () => `[${LEGAL.email}](mailto:${LEGAL.email})` };
  const t = createTranslator({ locale, messages: { m: raw }, namespace: "m" as never }) as unknown as {
    markup: (key: string, values: object) => string;
  };
  const one = (key: keyof Texts) => {
    if (!raw[key]) return undefined;
    try {
      return t.markup(key, { ...icu, ...tags });
    } catch {
      return raw[key];
    }
  };
  return {
    subject: one("subject") ?? "",
    preview: one("preview") ?? "",
    heading: one("heading") ?? "",
    body: one("body") ?? "",
    cta: one("cta"),
    footer: one("footer"),
  };
}

/** Texts of a job: edited ones where set, else the defaults. */
export async function jobTexts(job: Job): Promise<Texts | null> {
  if (job.campaignId) {
    const row = await editedTexts("campaign", job.campaignId, job.locale);
    return row ? format(merge({}, row), job.locale, job.payload.values) : null;
  }
  const definition = automation(job.automationKey ?? "");
  if (!definition) return null;
  const [defaults, row] = await Promise.all([
    defaultRaw(definition.messages, job.locale),
    editedTexts("automation", definition.key, job.locale),
  ]);
  return format(merge(defaults, row), job.locale, job.payload.values);
}

export const jobCategory = (job: Pick<Job, "automationKey" | "campaignId">): MailCategory =>
  job.campaignId ? "news" : (automation(job.automationKey ?? "")?.category ?? "transactional");

/** Absolute address of a campaign button: a page of the site or a web address. */
async function campaignLink(campaignId: string, locale: Locale) {
  const [campaign] = await db.select({ ctaUrl: emailCampaigns.ctaUrl }).from(emailCampaigns).where(eq(emailCampaigns.id, campaignId));
  const link = campaign?.ctaUrl;
  return link ? (link.startsWith("/") ? `${siteUrl()}/${locale}${link}` : link) : undefined;
}

async function unsubscribeLabel(locale: Locale) {
  const t = createTranslator({ locale, messages: await loadMessages(locale), namespace: "Emails.common" });
  return t("unsubscribe");
}

function element(locale: Locale, texts: Texts, target: string | undefined, info: string | undefined, unsubscribe?: { label: string; url: string }) {
  return createElement(ClubEmail, {
    locale,
    preview: texts.preview,
    heading: texts.heading,
    body: texts.body,
    info,
    cta: target && texts.cta ? { label: texts.cta, url: target } : undefined,
    footer: texts.footer,
    unsubscribe,
  });
}

/** Subject and email element of a job, ready for sendMail. */
export async function renderJob(job: Job) {
  const texts = await jobTexts(job);
  if (!texts) return null;
  const category = jobCategory(job);
  const target = job.campaignId
    ? await campaignLink(job.campaignId, job.locale)
    : (job.payload.url ?? (job.payload.path ? `${siteUrl()}/${job.locale}${job.payload.path}` : undefined));
  const url =
    category !== "transactional" && job.memberId
      ? unsubscribeUrl(siteUrl(), job.locale, job.memberId, category as NotificationType)
      : undefined;
  return {
    subject: texts.subject,
    unsubscribeUrl: url,
    react: element(job.locale, texts, target, job.payload.info, url ? { label: await unsubscribeLabel(job.locale), url } : undefined),
  };
}

/**
 * Preview / test of texts being edited in the admin (saved or not): example values; for
 * automations, an empty field shows the default text.
 */
export async function renderDraft({
  ownerType,
  ownerId,
  locale,
  draft,
  values,
}: {
  ownerType: "automation" | "campaign";
  ownerId: string;
  locale: Locale;
  draft?: Fields;
  values: Record<string, string>;
}) {
  let raw: Raw;
  let category: MailCategory = "news";
  let target: string | undefined;
  if (ownerType === "automation") {
    const definition = automation(ownerId);
    if (!definition) return null;
    category = definition.category;
    const edited = draft ?? (await editedTexts("automation", ownerId, locale));
    raw = merge(await defaultRaw(definition.messages, locale), edited);
    target = `${siteUrl()}/${locale}`;
  } else {
    const edited = draft ?? (await editedTexts("campaign", ownerId, locale));
    if (!edited) return null;
    raw = merge({}, edited);
    target = await campaignLink(ownerId, locale);
  }
  const texts = format(raw, locale, values);
  const unsubscribe =
    category !== "transactional"
      ? { label: await unsubscribeLabel(locale), url: `${siteUrl()}/${locale}/parametres/notifications` }
      : undefined;
  return { subject: texts.subject, react: element(locale, texts, target, undefined, unsubscribe) };
}
