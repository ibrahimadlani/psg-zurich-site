import { eq } from "drizzle-orm";
import { LayoutDashboard, Settings } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { MemberCard } from "@/components/member-area/member-card";
import { MyPredictions } from "@/components/member-area/my-predictions";
import { MyRegistrations } from "@/components/member-area/my-registrations";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import { members } from "@/db/schema";
import { Link, redirect } from "@/i18n/navigation";
import { getSession } from "@/lib/permissions";
import { hasRole } from "@/lib/roles";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("MemberArea");
  return { title: t("title"), robots: { index: false } };
}

/** Life as a member: card, my events, my predictions. Account settings live in /parametres. */
async function MemberPanel() {
  const t = await getTranslations("MemberArea");
  const tNav = await getTranslations("Nav");
  const session = await getSession();
  if (!session) return redirect({ href: "/connexion", locale: await getLocale() });

  const { user } = session;
  const [member] = await db.select().from(members).where(eq(members.userId, user.id));
  const name = member ? `${member.firstName} ${member.lastName}` : user.name || user.email;

  return (
    <div className="space-y-10">
      <MemberCard member={member ?? null} name={name} />
      {member?.status === "active" ? (
        <div className="grid gap-10 lg:grid-cols-2">
          <MyRegistrations memberId={member.id} />
          <MyPredictions memberId={member.id} />
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2 border-t pt-6">
        <Button variant="outline" asChild>
          <Link href="/parametres" prefetch={false}>
            <Settings aria-hidden />
            {tNav("settings")}
          </Link>
        </Button>
        {hasRole(user.role, "admin") ? (
          <Button variant="outline" asChild>
            <Link href="/admin" prefetch={false}>
              <LayoutDashboard aria-hidden />
              {t("adminLink")}
            </Link>
          </Button>
        ) : null}
        <SignOutButton />
      </div>
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
