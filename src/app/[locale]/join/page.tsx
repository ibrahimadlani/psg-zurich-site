import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { GuestOnly } from "@/components/auth/guest-only";
import { BrandShell } from "@/components/brand-shell";
import { MembershipForm } from "@/components/membership/membership-form";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata.pages.join");
  return pageMetadata({ path: "/join", title: t("title"), description: t("description") });
}

// Guest-only: signed-in members are redirected (proxy + GuestOnly).
export default function MembershipPage() {
  return (
    <BrandShell bare homeBar>
      <GuestOnly>
        <MembershipForm />
      </GuestOnly>
    </BrandShell>
  );
}
