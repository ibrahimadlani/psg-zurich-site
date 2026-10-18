import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SecuritySection } from "@/components/member-area/security-section";
import { ChangeEmailForm } from "@/components/settings/change-email-form";
import { DevicesSection } from "@/components/settings/devices-section";
import { SettingsBlock, SettingsSection } from "@/components/settings/settings-section";
import { getSettingsContext } from "@/lib/settings";
import { SettingsSkeleton } from "@/components/skeletons";
import { Streamed } from "@/components/ui/streamed";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Settings.sections");
  return { title: t("account.title"), robots: { index: false } };
}

async function Content() {
  const t = await getTranslations("Settings.account");
  const { session } = await getSettingsContext();
  return (
    <>
      <SettingsBlock title={t("email")} description={t("emailDescription")}>
        <ChangeEmailForm current={session.user.email} />
      </SettingsBlock>
      <SettingsBlock title={t("password")} description={t("passwordDescription")}>
        <SecuritySection bare />
      </SettingsBlock>
      <SettingsBlock title={t("devices")} description={t("devicesDescription")}>
        <DevicesSection />
      </SettingsBlock>
    </>
  );
}

export default function AccountSettingsPage() {
  return (
    <SettingsSection section="account">
      <Streamed fallback={<SettingsSkeleton />}>
        <Content />
      </Streamed>
    </SettingsSection>
  );
}
