import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { AdminsManager } from "@/components/admin/admins-manager";
import { EventsAdmin } from "@/components/admin/events-admin";
import { MembershipRequests } from "@/components/admin/membership-requests";
import { AnnouncementsAdmin } from "@/components/announcements/announcements-admin";
import { DeploymentStatus } from "@/components/deployment-status";
import { PageHeader } from "@/components/page-header";
import { redirect } from "@/i18n/navigation";
import { getSession } from "@/lib/permissions";
import { hasRole } from "@/lib/roles";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Admin");
  return { title: t("title"), robots: { index: false } };
}

async function AdminPanel() {
  const t = await getTranslations("Admin");
  const session = await getSession();
  if (!session) return redirect({ href: "/connexion", locale: await getLocale() });
  if (!hasRole(session.user.role, "admin")) {
    return <p className="text-destructive">{t("forbidden")}</p>;
  }

  return (
    <div className="space-y-8">
      <p className="font-medium">{t("welcome", { name: session.user.name || session.user.email })}</p>
      <MembershipRequests />
      <EventsAdmin />
      <AnnouncementsAdmin />
      {hasRole(session.user.role, "superadmin") ? <AdminsManager currentUserId={session.user.id} /> : null}
      <DeploymentStatus />
    </div>
  );
}

export default async function AdminPage() {
  const t = await getTranslations("Admin");
  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <Suspense fallback={<p className="text-muted-foreground">{t("loading")}</p>}>
        <AdminPanel />
      </Suspense>
    </>
  );
}
