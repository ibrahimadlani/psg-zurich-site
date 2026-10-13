import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { BrandShell } from "@/components/brand-shell";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
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
 * Welcome steps, once: right after the email is confirmed (the confirmation link signs in and
 * lands here), or at the first sign-in. Already done or skipped: straight on, unless the
 * member comes back from the "complete your profile" card (`?reprendre=1`).
 */
async function Welcome({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const locale = await getLocale();
  const session = await getSession();
  if (!session) return redirect({ href: "/connexion", locale });
  const params = await searchParams;
  const resume = params.reprendre === "1";
  const next = nextPath(params.suite ?? (resume ? "/espace-membre" : undefined));
  const [member] = await db
    .select({
      firstName: members.firstName,
      status: members.status,
      onboardedAt: members.onboardedAt,
      phone: members.phone,
      address: members.address,
      postcode: members.postcode,
      city: members.city,
      birthDate: members.birthDate,
      interests: members.interests,
      psgTicketing: members.psgTicketing,
      photoConsent: members.photoConsent,
    })
    .from(members)
    .where(eq(members.userId, session.user.id));
  if (!member || (member.onboardedAt && !resume)) return redirect({ href: next, locale });

  const address = [member.address, [member.postcode, member.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  return (
    <OnboardingFlow
      firstName={member.firstName}
      pending={member.status !== "active"}
      next={next}
      // Coming back to complete the profile: straight to the new questions.
      startAt={resume ? 2 : 0}
      initial={{
        phone: member.phone,
        address: address || null,
        birthDate: member.birthDate,
        interests: member.interests,
        psgTicketing: member.psgTicketing,
        photoConsent: member.photoConsent,
      }}
    />
  );
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
