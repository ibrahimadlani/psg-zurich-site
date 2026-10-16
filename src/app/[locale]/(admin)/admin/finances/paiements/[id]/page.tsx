import { ArrowLeft, FileText } from "lucide-react";
import type { Metadata } from "next";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { RefundButton } from "@/components/admin/finances/refund-button";
import { AdminHeader } from "@/components/admin/ui/admin-header";
import { StatusPill } from "@/components/admin/ui/status-pill";
import { adminCard, adminLabel } from "@/components/admin/ui/styles";
import { AdminListSkeleton } from "@/components/skeletons";
import type { Locale } from "@/db/schema";
import { Link } from "@/i18n/navigation";
import { paymentDetail } from "@/lib/admin/finances-query";
import { formatChf } from "@/lib/money";
import { formatPaymentReference } from "@/lib/payments/config";
import { ACCOUNT_LABELS } from "@/lib/payments/ledger";
import { methodLabel } from "@/lib/payments/receipts";
import { cn } from "@/lib/utils";

export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("AdminFinances");
  return { title: t("paymentsTitle"), robots: { index: false } };
}

const row = "flex items-baseline justify-between gap-4 px-4 py-2.5 text-[14px]";

/** One payment, as the auditors would want it: lines, how it was paid, the books, the trail. */
async function PaymentDetail({ id }: { id: string }) {
  await connection();
  const [t, format, locale, detail] = await Promise.all([getTranslations("AdminFinances"), getFormatter(), getLocale(), paymentDetail(id)]);
  if (!detail) notFound();
  const { payment, items, refunds, entries, events, trail, order, recordedBy } = detail;
  const labels = ACCOUNT_LABELS[locale as Locale];
  const refundable = payment.amount - payment.refundedAmount - refunds.filter(({ refund }) => refund.status === "pending").reduce((sum, { refund }) => sum + refund.amount, 0);
  const when = (date: Date | null) => (date ? format.dateTime(date, { dateStyle: "medium", timeStyle: "short" }) : "—");

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/finances/paiements" className="inline-flex items-center gap-1.5 self-start text-sm text-muted-foreground hover:text-foreground lg:hidden">
        <ArrowLeft className="size-4" aria-hidden />
        {t("paymentsTitle")}
      </Link>
      <AdminHeader
        eyebrow={`${t(`kinds.${payment.kind}`)} · ${formatPaymentReference(payment.reference)}`}
        title={formatChf(payment.amount)}
        description={payment.anonymous ? `${payment.payerName} · ${t("anonymous")}` : payment.payerName}
        className="mb-0 lg:mb-0"
        actions={
          <>
            {payment.receiptNumber ? (
              <a href={`/api/v1/receipts/${payment.receiptNumber}`} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border bg-card px-3 text-[13px] font-semibold">
                <FileText className="size-3.5" aria-hidden />
                {payment.receiptNumber}
              </a>
            ) : null}
            {refundable > 0 && ["succeeded", "partially_refunded"].includes(payment.status) ? <RefundButton paymentId={payment.id} refundable={refundable} /> : null}
          </>
        }
      />

      <dl className={cn(adminCard, "divide-y")}>
        <div className={row}>
          <dt className="text-muted-foreground">{t("detail.status")}</dt>
          <dd>
            <StatusPill tone={payment.status === "succeeded" ? "ok" : payment.status === "failed" ? "danger" : "neutral"}>{t(`status.${payment.status}` as never)}</StatusPill>
          </dd>
        </div>
        <div className={row}>
          <dt className="text-muted-foreground">{t("detail.method")}</dt>
          <dd>{methodLabel(payment, locale as Locale)}</dd>
        </div>
        <div className={row}>
          <dt className="text-muted-foreground">{t("detail.payer")}</dt>
          <dd className="min-w-0 truncate">{payment.payerEmail}</dd>
        </div>
        <div className={row}>
          <dt className="text-muted-foreground">{t("detail.paidAt")}</dt>
          <dd>{when(payment.paidAt)}</dd>
        </div>
        {payment.feeAmount !== null ? (
          <div className={row}>
            <dt className="text-muted-foreground">{t("detail.fees")}</dt>
            <dd className="tabular-nums">
              {formatChf(-payment.feeAmount)} · {t("detail.net")} {formatChf(payment.netAmount ?? payment.amount - payment.feeAmount)}
            </dd>
          </div>
        ) : null}
        {recordedBy ? (
          <div className={row}>
            <dt className="text-muted-foreground">{t("detail.recordedBy")}</dt>
            <dd>{recordedBy}</dd>
          </div>
        ) : null}
        {payment.message ? (
          <div className="px-4 py-3 text-[14px]">
            <dt className="text-muted-foreground">{t("detail.message")}</dt>
            <dd className="mt-1 whitespace-pre-line italic">« {payment.message} »</dd>
          </div>
        ) : null}
      </dl>

      <section className="space-y-2">
        <h2 className={adminLabel}>{t("detail.lines")}</h2>
        <ul className={cn(adminCard, "divide-y")}>
          {items.map((item) => (
            <li key={item.id} className={row}>
              <span className="min-w-0">
                {item.description}
                {item.quantity > 1 ? <span className="text-muted-foreground"> × {item.quantity}</span> : null}
              </span>
              <span className="shrink-0 tabular-nums">{formatChf(item.total)}</span>
            </li>
          ))}
        </ul>
        {order ? (
          <p className="text-[13px] text-muted-foreground">
            {t("detail.order")} {t(`orderStatus.${order.status}` as never)}
            {order.fulfilment === "shipping" && order.shippingAddress ? ` · ${order.shippingAddress.street}, ${order.shippingAddress.postcode} ${order.shippingAddress.city}` : ""}
          </p>
        ) : null}
      </section>

      {refunds.length ? (
        <section className="space-y-2">
          <h2 className={adminLabel}>{t("detail.refunds")}</h2>
          <ul className={cn(adminCard, "divide-y")}>
            {refunds.map(({ refund, by }) => (
              <li key={refund.id} className="flex flex-col gap-1 px-4 py-3 text-[14px]">
                <span className="flex items-baseline justify-between gap-4">
                  <span className="font-semibold tabular-nums">{formatChf(-refund.amount)}</span>
                  {refund.creditNoteNumber ? (
                    <a href={`/api/v1/receipts/${refund.creditNoteNumber}`} target="_blank" rel="noreferrer" className="font-mono text-[12px] underline underline-offset-2">
                      {refund.creditNoteNumber}
                    </a>
                  ) : (
                    <StatusPill tone={refund.status === "failed" ? "danger" : "warn"}>{t(`refundStatus.${refund.status}`)}</StatusPill>
                  )}
                </span>
                <span className="text-[13px] text-muted-foreground">
                  {refund.reason} · {by ?? "—"} · {when(refund.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-2">
        <h2 className={adminLabel}>{t("detail.books")}</h2>
        {entries.length ? (
          <ul className={cn(adminCard, "divide-y")}>
            {entries.map((entry) => (
              <li key={entry.id} className="flex items-baseline justify-between gap-4 px-4 py-2.5 text-[13px]">
                <span className="min-w-0">
                  <span className="text-muted-foreground">{entry.date} · </span>
                  {labels[entry.account]}
                </span>
                <span className={cn("shrink-0 tabular-nums", entry.amount < 0 && "text-destructive")}>{formatChf(entry.amount)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[13px] text-muted-foreground">{t("detail.noBooks")}</p>
        )}
      </section>

      <section className="space-y-2">
        <h2 className={adminLabel}>{t("detail.trail")}</h2>
        <ol className="relative flex flex-col gap-3 border-l pl-4 text-[13px]">
          <li>
            <span className="text-muted-foreground">{when(payment.createdAt)} · </span>
            {t("detail.started")}
          </li>
          {events.map((event) => (
            <li key={event.id}>
              <span className="text-muted-foreground">{when(event.receivedAt)} · </span>
              <span className="font-mono text-[12px]">{event.type}</span>
              {event.error ? <span className="text-destructive"> · {event.error}</span> : null}
            </li>
          ))}
          {trail.map(({ log, actor }) => (
            <li key={log.id}>
              <span className="text-muted-foreground">{when(log.createdAt)} · </span>
              <span className="font-mono text-[12px]">{log.action}</span>
              {actor ? <span className="text-muted-foreground"> · {actor}</span> : null}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

export default async function PaymentPage({ params }: PageProps<"/[locale]/admin/finances/paiements/[id]">) {
  const { id } = await params;
  return (
    <Suspense fallback={<AdminListSkeleton />}>
      <PaymentDetail id={id} />
    </Suspense>
  );
}
