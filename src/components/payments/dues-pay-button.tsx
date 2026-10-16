"use client";

import { ArrowRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { PaySheet } from "@/components/payments/pay-sheet";
import { formatChf } from "@/lib/money";
import { startPayment } from "@/lib/payments/client";

/** "Pay CHF 50.–": the season's fee, paid on the page in one sheet. */
export function DuesPayButton({ amount, line }: { amount: number; line: string }) {
  const t = useTranslations("Dues");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-segment px-6 font-wide text-[12px] font-semibold tracking-[0.06em] text-segment-foreground uppercase shadow-brand [transition:opacity_.2s,transform_.15s] hover:opacity-90 active:scale-[0.98] sm:w-auto"
      >
        {t("payNow", { amount: formatChf(amount) })}
        <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
      </button>
      <PaySheet
        open={open}
        onOpenChange={setOpen}
        title={t("sheetTitle")}
        lines={[{ label: line, amount }]}
        start={() => startPayment({ kind: "dues", locale })}
      />
    </>
  );
}
