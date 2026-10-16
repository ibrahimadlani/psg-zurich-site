"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { adminButton, adminCard, adminInput, adminLabel } from "@/components/admin/ui/styles";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const francs = (centimes: number) => (centimes / 100).toFixed(2);
const toCentimes = (value: string) => Math.round(Number(value.replace(",", ".")) * 100);

function MoneyField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={adminLabel}>{label}</span>
      <span className="relative">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[13px] text-muted-foreground">CHF</span>
        <input inputMode="decimal" value={value} onChange={(event) => onChange(event.target.value.replace(/[^\d.,]/g, ""))} className={cn(adminInput, "pl-12 tabular-nums")} />
      </span>
    </label>
  );
}

async function save(body: unknown) {
  const response = await fetch("/api/v1/admin/finances/settings", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error();
}

/** Fee of each season (as voted by the assembly), junior rate, and the shop's postage. */
export function FinanceSettings({ seasons, shipping }: { seasons: { season: string; adult: number; junior: number; set: boolean }[]; shipping: { fee: number; enabled: boolean } }) {
  const t = useTranslations("AdminFinances");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rates, setRates] = useState(seasons.map((season) => ({ ...season, adultText: francs(season.adult), juniorText: francs(season.junior) })));
  const [fee, setFee] = useState(francs(shipping.fee));
  const [enabled, setEnabled] = useState(shipping.enabled);

  const run = (body: unknown) =>
    startTransition(async () => {
      try {
        await save(body);
        toast.success(t("saved"));
        router.refresh();
      } catch {
        toast.error(t("saveError"));
      }
    });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {rates.map((rate, index) => (
        <section key={rate.season} className={cn(adminCard, "flex flex-col gap-4 p-5")}>
          <div className="space-y-1">
            <h2 className="font-semibold">{t("ratesTitle", { season: rate.season })}</h2>
            <p className="text-[13px] text-muted-foreground">{rate.set ? t("ratesSet") : t("ratesDefault")}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <MoneyField label={t("adult")} value={rate.adultText} onChange={(value) => setRates((current) => current.map((item, at) => (at === index ? { ...item, adultText: value } : item)))} />
            <MoneyField label={t("junior")} value={rate.juniorText} onChange={(value) => setRates((current) => current.map((item, at) => (at === index ? { ...item, juniorText: value } : item)))} />
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={() => run({ rates: { season: rate.season, adult: toCentimes(rate.adultText), junior: toCentimes(rate.juniorText) } })}
            className={adminButton("primary", "md", "self-start")}
          >
            {t("save")}
          </button>
        </section>
      ))}
      <section className={cn(adminCard, "flex flex-col gap-4 p-5")}>
        <div className="space-y-1">
          <h2 className="font-semibold">{t("shippingTitle")}</h2>
          <p className="text-[13px] text-muted-foreground">{t("shippingBody")}</p>
        </div>
        <label className="flex cursor-pointer items-center gap-3 text-[14px]">
          <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} className="size-4 accent-[var(--color-psg-blue)]" />
          {t("shippingEnabled")}
        </label>
        <MoneyField label={t("shippingFee")} value={fee} onChange={setFee} />
        <button type="button" disabled={pending} onClick={() => run({ shipping: { fee: toCentimes(fee), enabled } })} className={adminButton("primary", "md", "self-start")}>
          {t("save")}
        </button>
      </section>
    </div>
  );
}
