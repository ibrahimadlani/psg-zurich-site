import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { DataSection } from "@/components/member-area/data-section";
import { MembershipCard } from "@/components/member-area/membership-card";
import { ProfileForm } from "@/components/member-area/profile-form";
import { SecuritySection } from "@/components/member-area/security-section";
import { PageHeader } from "@/components/page-header";
import { db } from "@/db";
import { members } from "@/db/schema";
import { redirect } from "@/i18n/navigation";
import { getSession } from "@/lib/permissions";
import { hasRole } from "@/lib/roles";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("MemberArea");
  return { title: t("title"), robots: { index: false } };
}

async function MemberPanel() {
  const session = await getSession();
  if (!session) return redirect({ href: "/connexion", locale: await getLocale() });

  const { user } = session;
  const [profile] = await db
    .select({ firstName: members.firstName, lastName: members.lastName, phone: members.phone, city: members.city })
    .from(members)
    .where(eq(members.userId, user.id));

  return (
    <div className="space-y-6">
      <MembershipCard userId={user.id} isAdmin={hasRole(user.role, "admin")} />
      {profile ? (
        <ProfileForm
          email={user.email}
          defaults={{
            firstName: profile.firstName,
            lastName: profile.lastName,
            phone: profile.phone ?? "",
            city: profile.city ?? "",
          }}
        />
      ) : null}
      <SecuritySection />
      <DataSection canDelete={user.role !== "superadmin"} />
    </div>
  );
}

export default async function MemberAreaPage() {
  const t = await getTranslations("MemberArea");
  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <Suspense fallback={<p className="text-muted-foreground">{t("loading")}</p>}>
        <MemberPanel />
      </Suspense>
    </>
  );
}
