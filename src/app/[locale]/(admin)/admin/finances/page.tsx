import { Download, FileText } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { AdminHeader } from "@/components/admin/ui/admin-header";
import { Kpi } from "@/components/admin/ui/kpi";
import { adminButton, adminCard, adminLabel } from "@/components/admin/ui/styles";
import { AdminListSkeleton } from "@/components/skeletons";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/db/schema";
import { formatChf } from "@/lib/money";
import { ACCOUNT_LABELS, RESULT_ACCOUNTS, fiscalYears, yearTotals } from "@/lib/payments/ledger";
import { paymentsEnabled } from "@/lib/payments/stripe";
import { cn } from "@/lib/utils";
import { Streamed } from "@/components/ui/streamed";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("AdminFinances");
  return { title: t("title"), robots: { index: false } };
}

/** The financial year at a glance: what came in, what went back, the fees, the result. */
async function Overview({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const [t, locale, years, params] = await Promise.all([getTranslations("AdminFinances"), getLocale(), fiscalYears(), searchParams]);
  const asked = typeof params.exercice === "string" ? params.exercice.replace("-", "/") : null;
  const year = asked && years.includes(asked) ? asked : years[0]!;
  const totals = await yearTotals(year);
  const labels = ACCOUNT_LABELS[locale as Locale];
  const exportUrl = (format: "csv" | "pdf") => `/api/v1/admin/finances/export?year=${encodeURIComponent(year)}&format=${format}&locale=${locale}`;

  return (
    <>
      <AdminHeader
        eyebrow={t("year", { year })}
        title={t("title")}
        description={paymentsEnabled() ? t("description") : t("descriptionManual")}
        actions={
          <>
            <a href={exportUrl("csv")} className={adminButton("secondary")}>
              <Download aria-hidden />
              {t("exportCsv")}
            </a>
            <a href={exportUrl("pdf")} target="_blank" rel="noreferrer" className={adminButton("primary")}>
              <FileText aria-hidden />
              {t("report")}
            </a>
          </>
        }
      />
      {years.length > 1 ? (
        <div className="mb-6 flex flex-wrap gap-1.5">
          {years.map((item) => (
            <Link
              key={item}
              href={`/admin/finances?exercice=${item.replace("/", "-")}`}
              className={cn("inline-flex h-8 items-center rounded-full border px-3 text-[13px] tabular-nums", item === year ? "border-foreground bg-foreground text-background" : "bg-card text-muted-foreground hover:text-foreground")}
            >
              {item}
            </Link>
          ))}
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
        <Kpi label={t("kpiIncome")} value={formatChf(totals.income)} hint={t("kpiIncomeHint")} />
        <Kpi label={t("kpiRefunds")} value={formatChf(totals.refunds)} hint={t("kpiRefundsHint")} />
        <Kpi label={t("kpiFees")} value={formatChf(totals.fees)} hint={t("kpiFeesHint")} />
        <Kpi label={t("kpiResult")} value={formatChf(totals.result)} hint={t("kpiResultHint")} />
      </div>
      <section className="mt-8 space-y-3">
        <h2 className={adminLabel}>{t("byAccount")}</h2>
        <dl className={cn(adminCard, "divide-y")}>
          {RESULT_ACCOUNTS.map((account) => (
            <div key={account} className="flex items-baseline justify-between gap-4 px-4 py-3 text-[14px]">
              <dt>{labels[account]}</dt>
              <dd className={cn("tabular-nums", totals.byAccount[account] < 0 && "text-destructive")}>{formatChf(totals.byAccount[account])}</dd>
            </div>
          ))}
          <div className="flex items-baseline justify-between gap-4 px-4 py-3 text-[14px] font-semibold">
            <dt>{t("result")}</dt>
            <dd className="tabular-nums">{formatChf(totals.result)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 px-4 py-3 text-[13px] text-muted-foreground">
            <dt>{labels.payouts}</dt>
            <dd className="tabular-nums">{formatChf(totals.payouts)}</dd>
          </div>
        </dl>
        <p className="text-[13px] text-pretty text-muted-foreground">{t("ledgerNote")}</p>
      </section>
    </>
  );
}

export default function FinancesPage({ searchParams }: PageProps<"/[locale]/admin/finances">) {
  return (
    <Streamed fallback={<AdminListSkeleton />}>
      <Overview searchParams={searchParams} />
    </Streamed>
  );
}
