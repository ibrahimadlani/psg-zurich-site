import "server-only";
import { and, desc, eq, gt, isNull, ne, or } from "drizzle-orm";
import { db, type Transaction } from "@/db";
import { announcements } from "@/db/schema";
import type { AppLocale } from "@/i18n/routing";

export type Announcement = typeof announcements.$inferSelect;

/** The banner currently shown on the site, if any. */
export async function getActiveAnnouncement() {
  const [row] = await db
    .select()
    .from(announcements)
    .where(
      and(
        eq(announcements.active, true),
        or(isNull(announcements.endsAt), gt(announcements.endsAt, new Date())),
      ),
    )
    .orderBy(desc(announcements.updatedAt))
    .limit(1);
  return row ?? null;
}

export function localizeAnnouncement(row: Announcement, locale: AppLocale) {
  const pick = (fr: string, en: string | null, de: string | null) =>
    (locale === "en" ? en : locale === "de" ? de : null) || fr;
  return {
    // Changes whenever the announcement is edited, so a dismissed banner comes back.
    key: `${row.id}:${row.updatedAt.getTime()}`,
    tone: row.tone,
    title: pick(row.titleFr, row.titleEn, row.titleDe),
    message: pick(row.messageFr, row.messageEn, row.messageDe),
    linkUrl: row.linkUrl,
  };
}

/** Only one banner is live at a time: activating one switches the others off. */
export async function deactivateOthers(id: string, executor: Transaction | typeof db = db) {
  await executor
    .update(announcements)
    .set({ active: false })
    .where(and(eq(announcements.active, true), ne(announcements.id, id)));
}
