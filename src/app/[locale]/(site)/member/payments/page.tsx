import { ArrowLeft, FileText, Receipt } from "lucide-react";
import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { PageHeader } from "@/components/page-header";
import { Link } from "@/i18n/navigation";
import { redirectToSignIn } from "@/lib/auth-redirect";
import { getCurrentMember } from "@/lib/members";
import { formatChf } from "@/lib/money";
import { formatPaymentReference } from "@/lib/payments/config";
import { memberPayments } from "@/lib/payments/history";
import { methodLabel } from "@/lib/payments/receipts";
import { getSession } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { PaymentsSkeleton } from "@/components/skeletons";
import { Streamed } from "@/components/ui/skeleton";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("MyPayments");
  return { title: t("title"), robots: { index: false } };
}

const documentLink =
  "inline-flex h-8 items-center gap-1.5 rounded-full border bg-background px-3 text-[12px] font-semibold transition-colors hover:border-foreground/30";

/** Every payment of the member: what, when, how, its receipt (and credit notes), and the order's progress. */
async function Payments() {
  await connection();
  const [t, format, session, member] = await Promise.all([getTranslations("MyPayments"), getFormatter(), getSession(), getCurrentMember()]);
  if (!session) return redirectToSignIn();
  const list = member ? await memberPayments(member.id) : [];

  if (list.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-[14px] border border-dashed px-6 py-12 text-center">
        <Receipt className="size-6 text-muted-foreground" aria-hidden />
        <p className="text-[15px] text-muted-foreground">{t("empty")}</p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {list.map((payment) => {
        const title =
          payment.kind === "shop"
            ? payment.items.filter((item) => item.type === "product").map((item) => `${item.description}${item.quantity > 1 ? ` × ${item.quantity}` : ""}`).join(", ")
            : (payment.items[0]?.description ?? "");
        const status = payment.status === "refunded" ? t("status.refunded") : payment.status === "partially_refunded" ? t("status.partiallyRefunded") : payment.status === "processing" ? t("status.processing") : null;
        return (
          <li key={payment.id} className="flex flex-col gap-3 rounded-[14px] border bg-card p-4 shadow-brand sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 space-y-1">
                <p className="font-wide text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                  {t(`kinds.${payment.kind}`)} · {format.dateTime(payment.paidAt ?? payment.createdAt, { dateStyle: "medium" })}
                </p>
                <p className="text-[15px] leading-snug font-semibold text-pretty">{title}</p>
                <p className="text-[13px] text-muted-foreground">
                  {methodLabel(payment, member!.locale)} · {formatPaymentReference(payment.reference)}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className={cn("font-narrow text-[24px] leading-none font-extrabold tabular-nums italic", payment.status === "refunded" && "text-muted-foreground line-through")}>
                  {formatChf(payment.amount)}
                </p>
                {status ? <p className="mt-1 text-[12px] text-muted-foreground">{status}</p> : null}
              </div>
            </div>
            {payment.order ? (
              <Link href="/member/orders" prefetch={false} className="text-[13px] underline-offset-2 hover:underline">
                <span className="text-muted-foreground">{t("order")} </span>
                <span className="font-semibold">{t(`orderStatus.${payment.order.status}`)}</span>
                {payment.order.trackingNumber ? <span className="text-muted-foreground"> · {payment.order.trackingNumber}</span> : null}
              </Link>
            ) : null}
            {payment.receiptNumber || payment.refunds.length ? (
              <div className="flex flex-wrap gap-2 border-t pt-3">
                {payment.receiptNumber ? (
                  <a href={`/api/v1/receipts/${payment.receiptNumber}`} target="_blank" rel="noreferrer" className={documentLink}>
                    <FileText className="size-3.5" aria-hidden />
                    {t("receipt", { number: payment.receiptNumber })}
                  </a>
                ) : null}
                {payment.refunds.map((refund) =>
                  refund.creditNoteNumber ? (
                    <a key={refund.id} href={`/api/v1/receipts/${refund.creditNoteNumber}`} target="_blank" rel="noreferrer" className={documentLink}>
                      <FileText className="size-3.5" aria-hidden />
                      {t("creditNote", { number: refund.creditNoteNumber, amount: formatChf(refund.amount) })}
                    </a>
                  ) : null,
                )}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export default async function MyPaymentsPage() {
  const t = await getTranslations("MyPayments");
  return (
    <div className="flex flex-col gap-6">
      <Link href="/member" prefetch={false} className="inline-flex items-center gap-1.5 self-start text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden />
        {t("back")}
      </Link>
      <PageHeader title={t("title")} description={t("description")} />
      <Streamed fallback={<PaymentsSkeleton />}>
        <Payments />
      </Streamed>
    </div>
  );
}
