import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { DataSection } from "@/components/member-area/data-section";
import { SettingSwitch } from "@/components/settings/setting-switch";
import { SettingsBlock, SettingsSection } from "@/components/settings/settings-section";
import { getSettingsContext } from "@/lib/settings";
import { SettingsSkeleton } from "@/components/skeletons";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Settings.sections");
  return { title: t("privacy.title"), robots: { index: false } };
}

async function Content() {
  const t = await getTranslations("Settings.privacy");
  const { session, member } = await getSettingsContext();
  return (
    <>
      {member ? (
        <SettingsBlock title={t("leaderboard")} description={t("leaderboardDescription")}>
          <SettingSwitch field="hideFromLeaderboard" label={t("hide")} description={t("hideDescription")} initial={member.hideFromLeaderboard} />
        </SettingsBlock>
      ) : null}
      <SettingsBlock title={t("data")} description={t("dataDescription")}>
        <DataSection canDelete={session.user.role !== "superadmin"} bare />
      </SettingsBlock>
    </>
  );
}

export default function PrivacySettingsPage() {
  return (
    <SettingsSection section="privacy">
      <Suspense fallback={<SettingsSkeleton />}>
        <Content />
      </Suspense>
    </SettingsSection>
  );
}
