"use client";

import { Heart } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useId, useState } from "react";
import { AutoTextarea } from "@/components/contact/auto-textarea";
import { PaySheet } from "@/components/payments/pay-sheet";
import { formatChf } from "@/lib/money";
import { startPayment } from "@/lib/payments/client";
import { DONATION_MAX, DONATION_MIN, DONATION_PRESETS } from "@/lib/payments/config";
import { cn } from "@/lib/utils";

const field =
  "h-12 w-full rounded-[10px] border bg-card px-3.5 text-[16px] outline-none [transition:border-color_.2s,box-shadow_.2s] placeholder:text-muted-foreground focus:border-primary focus:shadow-[0_0_0_3px_oklch(0.62_0.13_248/0.2)] aria-invalid:border-destructive";
const label = "font-wide text-[10px] font-semibold tracking-[0.06em] text-muted-foreground uppercase";

/**
 * Donation: a quick amount (or one's own), an optional word for the club, then the payment
 * sheet. Visitors leave a name and an email for the receipt; members are already known.
 */
export function DonationForm({ signedIn }: { signedIn: boolean }) {
  const t = useTranslations("Support");
  const locale = useLocale();
  const ids = useId();
  const [preset, setPreset] = useState<number | null>(DONATION_PRESETS[1]!);
  const [custom, setCustom] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [open, setOpen] = useState(false);

  const amount = preset ?? Math.round(Number(custom.replace(",", ".")) * 100);
  const validAmount = Number.isFinite(amount) && amount >= DONATION_MIN && amount <= DONATION_MAX;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const next = {
      amount: !validAmount,
      name: !signedIn && name.trim().length === 0,
      email: !signedIn && !/^\S+@\S+\.\S+$/.test(email.trim()),
    };
    setErrors(next);
    if (!Object.values(next).some(Boolean)) setOpen(true);
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-3">
        <legend className={cn(label, "mb-3")}>{t("amount")}</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {DONATION_PRESETS.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={preset === value}
              onClick={() => {
                setPreset(value);
                setErrors((current) => ({ ...current, amount: false }));
              }}
              className="h-14 cursor-pointer rounded-[12px] border bg-card font-narrow text-[22px] font-extrabold italic tabular-nums transition-[border-color,background-color,color,transform] active:scale-[0.97] aria-pressed:border-segment aria-pressed:bg-segment aria-pressed:text-segment-foreground"
            >
              {formatChf(value).replace("CHF ", "")}
            </button>
          ))}
        </div>
        <label className="relative">
          <span className="sr-only">{t("customAmount")}</span>
          <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[14px] font-semibold text-muted-foreground">CHF</span>
          <input
            inputMode="decimal"
            placeholder={t("customAmount")}
            value={custom}
            aria-invalid={errors.amount || undefined}
            onFocus={() => setPreset(null)}
            onChange={(event) => {
              setPreset(null);
              setCustom(event.target.value.replace(/[^\d.,]/g, ""));
              setErrors((current) => ({ ...current, amount: false }));
            }}
            className={cn(field, "pl-14 tabular-nums", preset === null && custom && "border-segment")}
          />
        </label>
        {errors.amount ? <p className="text-[13px] text-destructive">{t("amountRange", { min: formatChf(DONATION_MIN), max: formatChf(DONATION_MAX) })}</p> : null}
      </fieldset>

      {signedIn ? null : (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className={label}>{t("name")}</span>
            <input id={`${ids}-name`} autoComplete="name" value={name} aria-invalid={errors.name || undefined} onChange={(event) => setName(event.target.value)} className={field} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={label}>{t("email")}</span>
            <input
              id={`${ids}-email`}
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              value={email}
              aria-invalid={errors.email || undefined}
              onChange={(event) => setEmail(event.target.value)}
              className={field}
            />
            <span className="text-[12px] text-muted-foreground">{t("emailHint")}</span>
          </label>
        </div>
      )}

      <label className="flex flex-col gap-1.5">
        <span className={label}>{t("message")}</span>
        <AutoTextarea
          value={message}
          maxLength={500}
          onChange={(event) => setMessage(event.target.value)}
          placeholder={t("messagePlaceholder")}
          className="min-h-[88px] w-full resize-none rounded-[10px] border bg-card px-3.5 py-3 text-[16px] outline-none focus:border-primary focus:shadow-[0_0_0_3px_oklch(0.62_0.13_248/0.2)]"
        />
      </label>

      <label className="flex cursor-pointer items-start gap-3 text-[14px]">
        <input type="checkbox" checked={anonymous} onChange={(event) => setAnonymous(event.target.checked)} className="mt-0.5 size-4 accent-[var(--color-psg-blue)]" />
        <span>
          <span className="font-semibold">{t("anonymous")}</span>
          <span className="block text-[13px] text-muted-foreground">{t("anonymousHint")}</span>
        </span>
      </label>

      <button
        type="submit"
        className="inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-segment px-6 font-wide text-[12px] font-semibold tracking-[0.06em] text-segment-foreground uppercase shadow-brand [transition:opacity_.2s,transform_.15s] hover:opacity-90 active:scale-[0.98]"
      >
        <Heart className="size-4" aria-hidden />
        {validAmount ? t("give", { amount: formatChf(amount) }) : t("giveNoAmount")}
      </button>

      <PaySheet
        open={open}
        onOpenChange={setOpen}
        title={t("sheetTitle")}
        lines={[{ label: t("line"), amount: validAmount ? amount : 0 }]}
        start={() =>
          startPayment({
            kind: "donation",
            locale,
            amount,
            ...(signedIn ? {} : { name: name.trim(), email: email.trim() }),
            message: message.trim() || undefined,
            anonymous,
          })
        }
      />
    </form>
  );
}
