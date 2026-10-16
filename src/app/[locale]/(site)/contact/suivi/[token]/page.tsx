import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { Suspense } from "react";
import { SenderThread } from "@/components/contact/sender-thread";
import { Link } from "@/i18n/navigation";
import { markSeenBySender, senderView } from "@/lib/contact";

// Private links only exist at runtime.
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ContactThread");
  // A private link: never indexed, never sent on as a referrer.
  return { title: t("listTitle"), robots: { index: false, follow: false }, referrer: "no-referrer" };
}

async function Tracking({ token }: { token: string }) {
  await connection();
  const view = await senderView({ token });
  if (!view) {
    const t = await getTranslations("ContactThread");
    return (
      <div className="grid min-h-[40svh] place-items-center text-center">
        <div className="space-y-3">
          <p className="text-lg">{t("notFound")}</p>
          <Link href="/contact" className="text-sm underline underline-offset-4">
            {t("write")}
          </Link>
        </div>
      </div>
    );
  }
  await markSeenBySender(view.thread.id);
  return <SenderThread view={view} sender={{ name: view.thread.name, email: view.thread.email }} token={token} />;
}

/** A visitor's conversation, opened from the private link of their emails (no account needed). */
export default async function ContactTrackingPage({ params }: PageProps<"/[locale]/contact/suivi/[token]">) {
  const { token } = await params;
  return (
    <Suspense fallback={<div className="skeleton h-64 rounded-[14px]" />}>
      <Tracking token={token} />
    </Suspense>
  );
}
