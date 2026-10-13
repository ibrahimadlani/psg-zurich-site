import "server-only";
import { eq, inArray, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { emailAutomations, emailJobs, mailingSettings, members, user, type Locale } from "@/db/schema";
import { LEGAL } from "@/lib/legal";
import { AUTOMATIONS, automation } from "@/lib/mailing/registry";

/** Where links in emails point (empty in local dev: the default dev port). */
export const siteUrl = () => (process.env.BETTER_AUTH_URL || "http://localhost:3000").replace(/\/$/, "");

export type Recipient = { memberId: string | null; email: string; locale: Locale; firstName: string };
export type JobContent = {
  values?: Record<string, string>;
  /** Page of the site, without the locale ("/evenements/…"). */
  path?: string;
  /** Or a full address. */
  url?: string;
  info?: string;
  /** Same key = same email, never queued twice; null for one-off sends (tests). */
  dedupe: string | null;
};

/** Rows for automations added to the registry since last start (defaults on). */
export async function ensureAutomations() {
  await db
    .insert(emailAutomations)
    .values(AUTOMATIONS.map((item) => ({ key: item.key, enabled: true, delayMinutes: item.delay })))
    .onDuplicateKeyUpdate({ set: { key: sql`${emailAutomations.key}` } });
}

export async function getMailingSettings() {
  const [row] = await db.select().from(mailingSettings).where(eq(mailingSettings.id, 1));
  return row ?? { id: 1, paused: false, dailyCap: 500, perMinute: 20, updatedAt: new Date() };
}

/** Member recipients matching `where` (members joined with their account). */
export function memberRecipients(where: SQL) {
  return db
    .select({ memberId: members.id, email: user.email, locale: members.locale, firstName: members.firstName })
    .from(members)
    .innerJoin(user, eq(user.id, members.userId))
    .where(where);
}

/** Admins and the club mailbox, each getting their own email (French). */
export async function committeeRecipients(): Promise<Recipient[]> {
  const admins = await db.select({ email: user.email }).from(user).where(inArray(user.role, ["admin", "superadmin"]));
  return [...new Set([LEGAL.email, ...admins.map((admin) => admin.email)])].map((email) => ({
    memberId: null,
    email,
    locale: "fr",
    firstName: "",
  }));
}

/**
 * Queues one email per recipient for an automation, if it is turned on, after its delay.
 * Never throws: an email must never break the action that triggered it.
 */
export async function enqueue(key: string, recipients: Recipient[], build: (recipient: Recipient) => JobContent) {
  const definition = automation(key);
  if (!definition || recipients.length === 0) return 0;
  try {
    const [settings] = await db.select().from(emailAutomations).where(eq(emailAutomations.key, key));
    if (settings && !settings.enabled) return 0;
    const delay = settings?.delayMinutes ?? definition.delay;
    const sendAfter = new Date(Date.now() + delay * 60_000);
    const rows = recipients.map((recipient) => {
      const content = build(recipient);
      return {
        automationKey: key,
        memberId: recipient.memberId,
        toEmail: recipient.email,
        locale: recipient.locale,
        payload: {
          values: { firstName: recipient.firstName, ...content.values },
          path: content.path,
          url: content.url,
          info: content.info,
        },
        dedupeKey: content.dedupe,
        sendAfter,
      };
    });
    // Already queued (same dedupe key): left as it is.
    await db
      .insert(emailJobs)
      .values(rows)
      .onDuplicateKeyUpdate({ set: { dedupeKey: sql`${emailJobs.dedupeKey}` } });
    return rows.length;
  } catch (error) {
    console.error(`[mailing] could not queue ${key}:`, error);
    return 0;
  }
}

/**
 * Date for an email, in the recipient's language and Zurich time: "samedi 18 octobre, 20:30"
 * for events, "30 juin 2027" for a day on its own.
 */
export const emailDate = (date: Date, locale: Locale, withTime = true) =>
  new Intl.DateTimeFormat(locale, {
    timeZone: "Europe/Zurich",
    day: "numeric",
    month: "long",
    ...(withTime ? { weekday: "long", hour: "2-digit", minute: "2-digit" } : { year: "numeric" }),
  }).format(date);
