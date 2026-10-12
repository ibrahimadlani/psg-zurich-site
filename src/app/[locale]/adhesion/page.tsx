import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { BrandShell } from "@/components/brand-shell";
import { MembershipFlow } from "@/components/membership/membership-flow";
import { getMemberByUserId, seasonLabel } from "@/lib/membership";
import { getSession } from "@/lib/permissions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Membership");
  return { title: t("title"), description: t("body") };
}

/** Signed-in members land on step 2 with their real membership status. */
async function Membership() {
  const session = await getSession();
  const member = session ? await getMemberByUserId(session.user.id) : null;
  const status = session ? (member?.status ?? "pending") : null;
  return <MembershipFlow initialStatus={status} season={seasonLabel()} />;
}

export default function MembershipPage() {
  return (
    <BrandShell>
      <Suspense fallback={<div className="min-h-[520px] w-full max-w-[420px]" />}>
        <Membership />
      </Suspense>
    </BrandShell>
  );
}
