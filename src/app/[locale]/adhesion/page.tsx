import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { GuestOnly } from "@/components/auth/guest-only";
import { BrandShell } from "@/components/brand-shell";
import { MembershipForm } from "@/components/membership/membership-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Membership");
  return { title: t("title"), description: t("body") };
}

// Guest-only: signed-in members are redirected (proxy + GuestOnly).
export default function MembershipPage() {
  return (
    <BrandShell bare>
      <GuestOnly>
        <MembershipForm />
      </GuestOnly>
    </BrandShell>
  );
}
