import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { AuthPanel } from "@/components/auth/auth-ui";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { BrandShell } from "@/components/brand-shell";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ResetPassword");
  return { title: t("title"), robots: { index: false } };
}

export default async function ResetPasswordPage() {
  const t = await getTranslations("ResetPassword");
  return (
    <BrandShell>
      <AuthPanel title={t("title")} body={t("body")}>
        {/* Reads ?token= from the URL, which is only known at request time. */}
        <Suspense>
          <ResetPasswordForm />
        </Suspense>
      </AuthPanel>
    </BrandShell>
  );
}
