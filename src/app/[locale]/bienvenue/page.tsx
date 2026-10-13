import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { BrandShell } from "@/components/brand-shell";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import { db } from "@/db";
import { members } from "@/db/schema";
import { redirect } from "@/i18n/navigation";
import { getSession } from "@/lib/permissions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Onboarding");
  return { title: t("pageTitle"), robots: { index: false } };
}

/** Where to go next: `?suite=/…` from the sign-in form (paths of this site only), else home. */
const nextPath = (suite: string | string[] | undefined) =>
  typeof suite === "string" && /^\/(?![/\\])/.test(suite) ? suite : "/";

/**
 * Welcome step, once: right after the email is confirmed (the confirmation link signs in and
 * lands here), or at the first sign-in. Already done or skipped: straight on.
 */
async function Welcome({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const locale = await getLocale();
  const session = await getSession();
  if (!session) return redirect({ href: "/connexion", locale });
  const next = nextPath((await searchParams).suite);
  const [member] = await db
    .select({ firstName: members.firstName, status: members.status, onboardedAt: members.onboardedAt })
    .from(members)
    .where(eq(members.userId, session.user.id));
  if (!member || member.onboardedAt) return redirect({ href: next, locale });

  return <OnboardingForm firstName={member.firstName} pending={member.status !== "active"} next={next} />;
}

export default function WelcomePage({ searchParams }: PageProps<"/[locale]/bienvenue">) {
  return (
    <BrandShell bare homeBar>
      <Suspense fallback={null}>
        <Welcome searchParams={searchParams} />
      </Suspense>
    </BrandShell>
  );
}
