import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ProfileForm } from "@/components/member-area/profile-form";
import { AvatarUploader } from "@/components/settings/avatar-uploader";
import { BirthDateForm, InterestsForm, PhotoConsentForm, TicketingForm } from "@/components/settings/member-profile-forms";
import { NicknameForm } from "@/components/settings/nickname-form";
import { displayName } from "@/lib/leaderboard";
import { SettingsBlock, SettingsSection } from "@/components/settings/settings-section";
import { getSettingsContext } from "@/lib/settings";
import { SettingsSkeleton } from "@/components/skeletons";
import { Streamed } from "@/components/ui/skeleton";

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
              defaults={{
                firstName: member.firstName,
                lastName: member.lastName,
                phone: member.phone ?? "",
                address: member.address ?? "",
                postcode: member.postcode ?? "",
                city: member.city ?? "",
              }}
              bare
            />
          </SettingsBlock>
          <SettingsBlock title={t("nickname")} description={t("nicknameDescription")}>
            <NicknameForm initial={member.nickname ?? ""} fallback={displayName(member.firstName, member.lastName)} />
          </SettingsBlock>
          <SettingsBlock title={t("memberProfile.birthDate")} description={t("memberProfile.birthDateDescription")}>
            <BirthDateForm initial={member.birthDate} />
          </SettingsBlock>
          <SettingsBlock title={t("memberProfile.interests")} description={t("memberProfile.interestsDescription")}>
            <InterestsForm initial={member.interests ?? []} />
          </SettingsBlock>
          <SettingsBlock title={t("memberProfile.ticketing")} description={t("memberProfile.ticketingDescription")}>
            <TicketingForm initial={member.psgTicketing} />
          </SettingsBlock>
          <SettingsBlock title={t("memberProfile.photos")} description={t("memberProfile.photosDescription")}>
            <PhotoConsentForm initial={member.photoConsent} />
          </SettingsBlock>
        </>
      ) : null}
    </>
  );
}

export default function ProfileSettingsPage() {
  return (
    <SettingsSection section="profile">
      <Streamed fallback={<SettingsSkeleton blocks={4} />}>
        <Content />
      </Streamed>
    </SettingsSection>
  );
}
