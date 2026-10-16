import { CreditCard } from "lucide-react";
import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { Suspense } from "react";
import { DuesBoard } from "@/components/admin/dues/dues-board";
import { AdminForbidden, AdminHeader } from "@/components/admin/ui/admin-header";
import { Kpi } from "@/components/admin/ui/kpi";
import { AdminListSkeleton } from "@/components/skeletons";
import { adminPage } from "@/lib/admin/guard";
import { listMembers } from "@/lib/admin/members-query";
import { seasonEnd } from "@/lib/dues";
import { LEGAL } from "@/lib/legal";
import { can } from "@/lib/roles";
import { NewCampaignButton } from "@/components/mailing/mailing-actions";
import { adminButton } from "@/components/admin/ui/styles";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("AdminDues");
  return { title: t("title"), robots: { index: false } };
}

async function Dues() {
  await connection();
  const [t, format] = await Promise.all([getTranslations("AdminDues"), getFormatter()]);
  const session = await adminPage("members.write");
  if (!session) return <AdminForbidden message={(await getTranslations("Admin"))("forbidden")} />;
  const rows = (await listMembers()).filter((row) => row.status === "active");
  const end = seasonEnd();
  const paid = rows.filter((row) => row.paid).length;
  const season = `${Number(end.slice(0, 4)) - 1}/${end.slice(2, 4)}`;

  return (
    <>
      <AdminHeader
        eyebrow={t("season", { season })}
        title={t("title")}
        description={t("description", { end: format.dateTime(new Date(`${end}T12:00:00Z`), { dateStyle: "long" }), fee: LEGAL.statutes.fee })}
        actions={
          can(session.user.role, "mailing") && rows.length > paid ? (
            <NewCampaignButton audience="unpaid" defaultName={t("campaignName", { season })} label={t("writeUnpaid")} className={adminButton("secondary")} />
          ) : null
        }
      />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_16rem] lg:gap-10">
        <DuesBoard rows={rows} />
        <aside className="space-y-3 max-lg:order-first">
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
            <Kpi
              label={t("kpiPaid")}
              value={rows.length ? `${Math.round((paid / rows.length) * 100)}%` : "—"}
              gauge={rows.length ? paid / rows.length : 0}
              hint={t("kpiPaidHint", { paid, total: rows.length })}
            />
            <Kpi label={t("kpiAmount")} value="—" hint={t("kpiAmountHint")} />
          </div>
          {/* Online payment is planned: the fee will then be recorded by itself. */}
          <p className="flex gap-2.5 rounded-[12px] border border-dashed p-3.5 text-[13px] text-pretty text-muted-foreground">
            <CreditCard className="mt-0.5 size-4 shrink-0" aria-hidden />
            {t("onlineSoon")}
          </p>
        </aside>
      </div>
    </>
  );
}

export default function DuesPage() {
  return (
    <Suspense fallback={<AdminListSkeleton />}>
      <Dues />
    </Suspense>
  );
}
