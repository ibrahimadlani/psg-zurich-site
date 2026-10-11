import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Link, redirect } from "@/i18n/navigation";
import { getSession } from "@/lib/permissions";
import { hasRole } from "@/lib/roles";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("MemberArea");
  return { title: t("title"), robots: { index: false } };
}

async function MemberPanel() {
  const t = await getTranslations("MemberArea");
  const session = await getSession();
  if (!session) return redirect({ href: "/connexion", locale: await getLocale() });

  const { user } = session;
  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>{user.name || user.email}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 text-sm text-muted-foreground">
        <p>{t("signedInAs", { email: user.email })}</p>
        <p>{t("role", { role: t(`roles.${user.role}`) })}</p>
      </CardContent>
      <CardFooter className="flex gap-2">
        {hasRole(user.role, "admin") ? (
          <Button asChild>
            <Link href="/admin">{t("adminLink")}</Link>
          </Button>
        ) : null}
        <SignOutButton />
      </CardFooter>
    </Card>
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
