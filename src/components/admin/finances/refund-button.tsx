"use client";

import { Undo2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { notify } from "@/lib/notify";
import { ResponsivePanel } from "@/components/admin/ui/responsive-panel";
import { adminButton, adminInput, adminLabel } from "@/components/admin/ui/styles";
import { useRouter } from "@/i18n/navigation";
import { formatChf } from "@/lib/money";

/** Gives all or part of a payment back: amount (all by default), a reason, a confirmation. */
export function RefundButton({ paymentId, refundable }: { paymentId: string; refundable: number }) {
  const t = useTranslations("AdminFinances");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState((refundable / 100).toFixed(2));
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();
  const centimes = Math.round(Number(amount.replace(",", ".")) * 100);
  const valid = Number.isFinite(centimes) && centimes >= 1 && centimes <= refundable && reason.trim().length >= 3;

  function submit() {
    startTransition(async () => {
      const response = await fetch(`/api/v1/admin/payments/${paymentId}/refund`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ amount: centimes, reason: reason.trim() }),
      });
      const body = (await response.json().catch(() => null)) as { data?: { status: string; creditNoteNumber: string | null } } | null;
      if (!response.ok || !body?.data) {
        notify.error(t("refundError"));
        return;
      }
      notify.success(body.data.status === "succeeded" ? t("refundDone", { number: body.data.creditNoteNumber ?? "" }) : t("refundPending"));
      setOpen(false);
      setReason("");
      router.refresh();
    });
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={adminButton("danger")}>
        <Undo2 aria-hidden />
        {t("refund")}
      </button>
      <ResponsivePanel
        open={open}
        onOpenChange={setOpen}
        title={t("refundTitle")}
        description={t("refundDescription", { amount: formatChf(refundable) })}
        footer={
          <>
            <button type="button" onClick={() => setOpen(false)} className={adminButton("ghost")}>
              {t("cancel")}
            </button>
            <button type="button" disabled={!valid || pending} onClick={submit} className={adminButton("danger")}>
              {pending ? t("refunding") : t("refundConfirm", { amount: valid ? formatChf(centimes) : "—" })}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          <label className="flex flex-col gap-1.5">
            <span className={adminLabel}>{t("refundAmount")}</span>
            <input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value.replace(/[^\d.,]/g, ""))} className={adminInput} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={adminLabel}>{t("refundReason")}</span>
            <textarea value={reason} maxLength={500} rows={3} onChange={(event) => setReason(event.target.value)} placeholder={t("refundReasonHint")} className={`${adminInput} h-auto py-2`} />
          </label>
          <p className="text-[13px] text-pretty text-muted-foreground">{t("refundNote")}</p>
        </div>
      </ResponsivePanel>
    </>
  );
}
