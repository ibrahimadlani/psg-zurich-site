import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthPanel, inlineLinkClass } from "@/components/auth/auth-ui";
import { GuestOnly } from "@/components/auth/guest-only";
import { LoginForm } from "@/components/auth/login-form";
import { BrandShell } from "@/components/brand-shell";
import { Link } from "@/i18n/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Login");
  return { title: t("title"), robots: { index: false } };
}

export default async function LoginPage() {
  const t = await getTranslations("Login");
  return (
    <BrandShell bare homeBar>
      <GuestOnly>
        <AuthPanel title={t("title")} body={t("body")}>
          <LoginForm />
          <p className="text-center text-[14px] text-muted-foreground">
            {t("noAccount")}{" "}
            <Link href="/adhesion" prefetch={false} className={inlineLinkClass}>
              {t("join")}
            </Link>
          </p>
        </AuthPanel>
      </GuestOnly>
    </BrandShell>
  );
}
