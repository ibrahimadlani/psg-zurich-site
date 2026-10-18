import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { AdminHeader } from "@/components/admin/ui/admin-header";
import { adminCard } from "@/components/admin/ui/styles";
import { AdminListSkeleton } from "@/components/skeletons";
import { listPayouts, payoutPayments } from "@/lib/admin/finances-query";
import { formatChf } from "@/lib/money";
import { formatPaymentReference } from "@/lib/payments/config";
import { cn } from "@/lib/utils";
import { Streamed } from "@/components/ui/streamed";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("AdminFinances");
  return { title: t("payoutsTitle"), robots: { index: false } };
}

/** Each transfer to the bank with the payments it carries: to tick off the bank statement. */
async function Payouts() {
  await connection();
  const [t, format] = await Promise.all([getTranslations("AdminFinances"), getFormatter()]);
  const payouts = await listPayouts();
  const details = await Promise.all(payouts.map((payout) => payoutPayments(payout.id)));
  return (
    <>
      <AdminHeader title={t("payoutsTitle")} description={t("payoutsDescription")} />
      {payouts.length === 0 ? (
        <p className="rounded-[12px] border border-dashed px-4 py-10 text-center text-[14px] text-muted-foreground">{t("noPayouts")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {payouts.map((payout, index) => (
            <li key={payout.id}>
              <details className={cn(adminCard, "group")}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3.5 [&::-webkit-details-marker]:hidden">
                  <span className="min-w-0">
                    <span className="block font-semibold">{format.dateTime(new Date(`${payout.arrivalDate}T12:00:00Z`), { dateStyle: "long" })}</span>
                    <span className="block text-[12px] text-muted-foreground">
                      {t("payoutLine", { count: payout.payments, fees: formatChf(-payout.fees) })} · <span className="font-mono">{payout.stripePayoutId}</span>
                    </span>
                  </span>
                  <span className="shrink-0 text-[15px] font-semibold tabular-nums">{formatChf(payout.amount)}</span>
                </summary>
                <ul className="divide-y border-t text-[13px]">
                  {details[index]!.map((payment) => (
                    <li key={payment.id} className="flex items-baseline justify-between gap-4 px-4 py-2">
                      <span className="min-w-0 truncate">
                        <span className="font-mono">{payment.receiptNumber ?? formatPaymentReference(payment.reference)}</span> · {payment.payerName}
                      </span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {formatChf(payment.amount)} − {formatChf(payment.feeAmount ?? 0)} = <span className="text-foreground">{formatChf(payment.netAmount ?? payment.amount)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default function PayoutsPage() {
  return (
    <Streamed fallback={<AdminListSkeleton />}>
      <Payouts />
    </Streamed>
  );
}
