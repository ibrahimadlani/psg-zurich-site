import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { Suspense } from "react";
import { Scanner } from "@/components/admin/scanner/scanner";
import { AdminForbidden, AdminHeader } from "@/components/admin/ui/admin-header";
import { PanelSkeleton } from "@/components/skeletons";
import { adminPage } from "@/lib/admin/guard";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("AdminShell");
  return { title: t("sections.scanner"), robots: { index: false } };
}

async function ScannerFrame({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const { evenement, carte } = await searchParams;
  const card = typeof carte === "string" ? carte : null;
  const session = await adminPage("scan", card ? `/admin/scanner?carte=${encodeURIComponent(card)}` : "/admin/scanner");
  if (!session) return <AdminForbidden message={(await getTranslations("Admin"))("forbidden")} />;
  return <Scanner initialEvent={typeof evenement === "string" ? evenement : null} initialCard={card} />;
}

/** The door: read member cards with the phone's camera and let people in. */
export default async function ScannerPage({ searchParams }: PageProps<"/[locale]/admin/scanner">) {
  const t = await getTranslations("AdminScanner");
  return (
    <div className="mx-auto w-full max-w-xl">
      <AdminHeader title={t("title")} description={t("description")} className="mb-5" />
      <Suspense fallback={<PanelSkeleton />}>
        <ScannerFrame searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
