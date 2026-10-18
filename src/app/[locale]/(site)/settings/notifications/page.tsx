import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SettingSwitch } from "@/components/settings/setting-switch";
import { SettingsBlock, SettingsSection } from "@/components/settings/settings-section";
import { getSettingsContext } from "@/lib/settings";
import { SettingsSkeleton } from "@/components/skeletons";
import { Streamed } from "@/components/ui/streamed";

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
        <SettingSwitch field="notifyResults" label={t("results")} description={t("resultsDescription")} initial={member.notifyResults} />
        <SettingSwitch field="notifyNews" label={t("news")} description={t("newsDescription")} initial={member.notifyNews} />
      </div>
      <p className="pt-4 text-xs text-muted-foreground">{t("essential")}</p>
    </SettingsBlock>
  );
}

export default function NotificationsSettingsPage() {
  return (
    <SettingsSection section="notifications">
      <Streamed fallback={<SettingsSkeleton blocks={4} />}>
        <Content />
      </Streamed>
    </SettingsSection>
  );
}
