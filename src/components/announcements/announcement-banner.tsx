import { getLocale, getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { AnnouncementBar } from "@/components/announcements/announcement-bar";
import { getActiveAnnouncement, localizeAnnouncement } from "@/lib/announcements";

/** Top banner managed from /admin. Rendered at request time; never breaks the page. */
export async function AnnouncementBanner() {
  await connection();

  let row: Awaited<ReturnType<typeof getActiveAnnouncement>>;
  try {
    row = await getActiveAnnouncement();
  } catch (error) {
    console.error("[banner] could not load the announcement:", error);
    return null;
  }
  if (!row) return null;

  const [locale, t] = await Promise.all([getLocale(), getTranslations("Banner")]);
  const announcement = localizeAnnouncement(row, locale);

  return (
    <AnnouncementBar
      storageKey={announcement.key}
      tone={announcement.tone}
      title={announcement.title}
      message={announcement.message}
      linkUrl={announcement.linkUrl}
      closeLabel={t("close")}
      learnMore={t("learnMore")}
    />
  );
}
