import { getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { FinanceTabs } from "@/components/admin/finances/finance-tabs";
import { AdminForbidden } from "@/components/admin/ui/admin-header";
import { AdminListSkeleton } from "@/components/skeletons";
import { ordersToPrepare } from "@/lib/admin/finances-query";
import { adminPage } from "@/lib/admin/guard";
import { Streamed } from "@/components/ui/streamed";

/** Finances: the parts as tabs above, each page below (only for the committee's admins). */
async function FinancesFrame({ children }: { children: React.ReactNode }) {
  await connection();
  const session = await adminPage("finances");
  if (!session) return <AdminForbidden message={(await getTranslations("Admin"))("forbidden")} />;
  return (
    <>
      <FinanceTabs toPrepare={await ordersToPrepare()} />
      {children}
    </>
  );
}

export default function FinancesLayout({ children }: LayoutProps<"/[locale]/admin/finances">) {
  return (
    <Streamed fallback={<AdminListSkeleton />}>
      <FinancesFrame>{children}</FinancesFrame>
    </Streamed>
  );
}
