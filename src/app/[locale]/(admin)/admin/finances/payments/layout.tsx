import { getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { PaymentsList } from "@/components/admin/finances/payments-list";
import { AdminHeader } from "@/components/admin/ui/admin-header";
import { MasterDetail } from "@/components/admin/ui/master-detail";
import { AdminListSkeleton } from "@/components/skeletons";
import { listPayments } from "@/lib/admin/finances-query";
import { Streamed } from "@/components/ui/skeleton";

/** The payments stay on the left (filters kept) while one opens on the right. */
async function PaymentsFrame({ children }: { children: React.ReactNode }) {
  await connection();
  const t = await getTranslations("AdminFinances");
  const rows = await listPayments({ status: "all" });
  return (
    <MasterDetail
      list={
        <>
          <AdminHeader title={t("paymentsTitle")} description={t("paymentsDescription")} className="mb-5 lg:mb-6" />
          <PaymentsList rows={rows} />
        </>
      }
    >
      {children}
    </MasterDetail>
  );
}

export default function PaymentsLayout({ children }: LayoutProps<"/[locale]/admin/finances/payments">) {
  return (
    <Streamed fallback={<AdminListSkeleton />}>
      <PaymentsFrame>{children}</PaymentsFrame>
    </Streamed>
  );
}
