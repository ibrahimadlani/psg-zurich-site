import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { SenderThread } from "@/components/contact/sender-thread";
import { Link, redirect } from "@/i18n/navigation";
import { senderView } from "@/lib/contact";
import { getCurrentMember } from "@/lib/members";
import { getSession } from "@/lib/permissions";

export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ContactThread");
  return { title: t("listTitle"), robots: { index: false } };
}

async function MemberThread({ id }: { id: string }) {
  await connection();
  const session = await getSession();
  if (!session) return redirect({ href: "/connexion", locale: await getLocale() });
  const member = await getCurrentMember();
  const view = member ? await senderView({ memberId: member.id, id }) : null;
  if (!view || !member) notFound();
  return <SenderThread view={view} sender={{ name: `${member.firstName} ${member.lastName}`, email: session.user.email, image: session.user.image }} />;
}

/** One of my conversations with the committee. */
export default async function MemberThreadPage({ params }: PageProps<"/[locale]/espace-membre/messages/[id]">) {
  const [{ id }, t] = await Promise.all([params, getTranslations("ContactThread")]);
  return (
    <div className="space-y-6">
      <Link href="/espace-membre/messages" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden />
        {t("back")}
      </Link>
      <Suspense fallback={<div className="skeleton h-64 rounded-[14px]" />}>
        <MemberThread id={id} />
      </Suspense>
    </div>
  );
}
