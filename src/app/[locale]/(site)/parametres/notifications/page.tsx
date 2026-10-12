import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { SettingSwitch } from "@/components/settings/setting-switch";
import { SettingsBlock, SettingsSection } from "@/components/settings/settings-section";
import { getSettingsContext } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Settings.sections");
  return { title: t("notifications.title"), robots: { index: false } };
}

async function Content() {
  const t = await getTranslations("Settings.notifications");
  const { member } = await getSettingsContext();
  if (!member) return <p className="py-6 text-sm text-muted-foreground">{t("noMember")}</p>;
  return (
    <SettingsBlock title={t("emails")} description={t("emailsDescription")}>
      <div className="divide-y">
        <SettingSwitch field="notifyEvents" label={t("events")} description={t("eventsDescription")} initial={member.notifyEvents} />
        <SettingSwitch
          field="notifyPredictionReminders"
          label={t("reminders")}
          description={t("remindersDescription")}
          initial={member.notifyPredictionReminders}
        />
      </div>
    </SettingsBlock>
  );
}

export default function NotificationsSettingsPage() {
  return (
    <SettingsSection section="notifications">
      <Suspense fallback={<p className="py-6 text-sm text-muted-foreground">…</p>}>
        <Content />
      </Suspense>
    </SettingsSection>
  );
}
