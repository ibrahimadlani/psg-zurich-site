import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ForgotPasswordPanel } from "@/components/auth/forgot-password-form";
import { GuestOnly } from "@/components/auth/guest-only";
import { BrandShell } from "@/components/brand-shell";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ForgotPassword");
  return { title: t("title"), robots: { index: false } };
}

export default function ForgotPasswordPage() {
  return (
    <BrandShell bare homeBar>
      <GuestOnly>
        <ForgotPasswordPanel />
      </GuestOnly>
    </BrandShell>
  );
}
