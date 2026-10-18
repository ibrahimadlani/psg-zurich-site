import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { NewAnnouncementButton } from "@/components/announcements/announcement-form";
import { AnnouncementsAdmin } from "@/components/announcements/announcements-admin";
import { AdminForbidden, AdminHeader } from "@/components/admin/ui/admin-header";
import { AdminSkeleton } from "@/components/skeletons";
import { adminPage } from "@/lib/admin/guard";
import { Streamed } from "@/components/ui/skeleton";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("AdminShell");
  return { title: t("sections.banner"), robots: { index: false } };
}

async function Banner() {
  await connection();
  const session = await adminPage("news");
  if (!session) return <AdminForbidden message={(await getTranslations("Admin"))("forbidden")} />;
  return <AnnouncementsAdmin />;
}

export default async function AdminBannerPage() {
  const t = await getTranslations("AdminShell");
  const tBanner = await getTranslations("AdminBanner");
  return (
    <>
      <AdminHeader title={t("sections.banner")} description={tBanner("description")} actions={<NewAnnouncementButton />} />
      <Streamed fallback={<AdminSkeleton cards={1} />}>
        <Banner />
      </Streamed>
    </>
  );
}
