import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { ProfileForm } from "@/components/member-area/profile-form";
import { AvatarUploader } from "@/components/settings/avatar-uploader";
import { NicknameForm } from "@/components/settings/nickname-form";
import { displayName } from "@/lib/leaderboard";
import { SettingsBlock, SettingsSection } from "@/components/settings/settings-section";
import { getSettingsContext } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Settings.sections");
  return { title: t("profile.title"), robots: { index: false } };
}

async function Content() {
  const t = await getTranslations("Settings.profile");
  const { session, member } = await getSettingsContext();
  const { user } = session;
  return (
    <>
      <SettingsBlock title={t("photo")} description={t("photoDescription")}>
        <AvatarUploader name={user.name} email={user.email} image={user.image ?? null} />
      </SettingsBlock>
      {member ? (
        <>
          <SettingsBlock title={t("details")} description={t("detailsDescription")}>
            <ProfileForm
              email={user.email}
              defaults={{ firstName: member.firstName, lastName: member.lastName, phone: member.phone ?? "", city: member.city ?? "" }}
              bare
            />
          </SettingsBlock>
          <SettingsBlock title={t("nickname")} description={t("nicknameDescription")}>
            <NicknameForm initial={member.nickname ?? ""} fallback={displayName(member.firstName, member.lastName)} />
          </SettingsBlock>
        </>
      ) : null}
    </>
  );
}

export default function ProfileSettingsPage() {
  return (
    <SettingsSection section="profile">
      <Suspense fallback={<p className="py-6 text-sm text-muted-foreground">…</p>}>
        <Content />
      </Suspense>
    </SettingsSection>
  );
}
