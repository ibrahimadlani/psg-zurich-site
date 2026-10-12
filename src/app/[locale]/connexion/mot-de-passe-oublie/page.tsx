import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthPanel, inlineLinkClass } from "@/components/auth/auth-ui";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { BrandShell } from "@/components/brand-shell";
import { Link } from "@/i18n/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ForgotPassword");
  return { title: t("title"), robots: { index: false } };
}

export default async function ForgotPasswordPage() {
  const t = await getTranslations("ForgotPassword");
  return (
    <BrandShell bare>
      <AuthPanel title={t("title")} body={t("body")}>
        <ForgotPasswordForm />
        <p className="text-center text-[14px]">
          <Link href="/connexion" className={inlineLinkClass}>
            {t("backToLogin")}
          </Link>
        </p>
      </AuthPanel>
    </BrandShell>
  );
}
