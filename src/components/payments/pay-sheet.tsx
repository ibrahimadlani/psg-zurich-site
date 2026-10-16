"use client";

import { Check, ChevronDown, CreditCard, Loader2, Lock } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { ResponsivePanel } from "@/components/admin/ui/responsive-panel";
import { useRouter } from "@/i18n/navigation";
import { formatChf } from "@/lib/money";
import {
  loadStripe,
  rememberSecret,
  type PaymentRequest,
  type StripeElement,
  type StripeError,
  type StripeJs,
} from "@/lib/payments/stripe-js";
import { cn } from "@/lib/utils";

/** What the server answers when a payment starts (lib/payments/checkout.ts). */
export type Checkout = {
  reference: string;
  clientSecret: string;
  amount: number;
  methods: ("card" | "twint")[];
  savedCard: { id: string; brand: string; last4: string } | null;
};

type Line = { label: string; amount: number };
type Phase = { name: "starting" } | { name: "ready" } | { name: "paying" } | { name: "error"; message: string };

const BRANDS: Record<string, string> = { visa: "Visa", mastercard: "Mastercard", amex: "Amex", discover: "Discover", jcb: "JCB", unionpay: "UnionPay", diners: "Diners" };

const option =
  "flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] font-wide text-[12px] font-semibold tracking-[0.06em] uppercase [transition:opacity_.2s,transform_.15s,background-color_.2s] active:scale-[0.98] disabled:cursor-default disabled:opacity-50";

/** Colours of the secure card fields, read from the site's theme (they live in frames). */
function fieldStyle() {
  const dark = document.documentElement.classList.contains("dark");
  return {
    base: {
      color: dark ? "#fafafa" : "#0a0a0a",
      fontFamily: "Virage, ui-sans-serif, system-ui, sans-serif",
      fontSize: "16px",
      fontSmoothing: "antialiased",
      iconColor: dark ? "#a3a3a3" : "#737373",
      "::placeholder": { color: dark ? "#737373" : "#a3a3a3" },
    },
    invalid: { color: dark ? "#f87171" : "#da291c", iconColor: dark ? "#f87171" : "#da291c" },
  };
}

/** One secure field (number, expiry or CVC), framed like the site's inputs. */
function CardField({ label, mountRef, focused, invalid, className }: { label: string; mountRef: React.RefObject<HTMLDivElement | null>; focused: boolean; invalid: boolean; className?: string }) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="font-wide text-[10px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">{label}</span>
      <div
        data-focused={focused || undefined}
        aria-invalid={invalid || undefined}
        className="flex h-12 items-center rounded-[10px] border bg-card px-3.5 [transition:border-color_.2s,box-shadow_.2s] data-[focused]:border-primary data-[focused]:shadow-[0_0_0_3px_oklch(0.62_0.13_248/0.2)] aria-invalid:border-destructive"
      >
        <div ref={mountRef} className="w-full" />
      </div>
    </label>
  );
}

/**
 * The payment sheet of the whole site (fee, shop, donation): the total, then the quickest ways
 * to pay — the saved card, Apple Pay / Google Pay, TWINT — and the card form last. Everything
 * is drawn by the site; the provider's script only hosts the card fields and confirms the
 * payment. On success, the payer goes to the payment's page (receipt, what comes next).
 */
export function PaySheet({
  open,
  onOpenChange,
  title,
  lines,
  start,
  onPaid,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** What is paid for, shown above the total. */
  lines: Line[];
  /** Asks the server for the payment (amount set there). */
  start: () => Promise<Checkout>;
  /** Paid on the page (an order's cart can be emptied). */
  onPaid?: () => void;
}) {
  const t = useTranslations("Pay");
  const locale = useLocale();
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>({ name: "starting" });
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const [stripe, setStripe] = useState<StripeJs | null>(null);
  const [wallet, setWallet] = useState<{ request: PaymentRequest; kind: "apple" | "google" } | null>(null);
  const [cardOpen, setCardOpen] = useState(false);
  const [focus, setFocus] = useState<string | null>(null);
  const [complete, setComplete] = useState({ number: false, expiry: false, cvc: false });
  const [fieldError, setFieldError] = useState<string | null>(null);
  const numberRef = useRef<HTMLDivElement>(null);
  const expiryRef = useRef<HTMLDivElement>(null);
  const cvcRef = useRef<HTMLDivElement>(null);
  const cardElement = useRef<StripeElement | null>(null);
  // The payment is asked for once per opening (a retry reuses it).
  const started = useRef(false);

  const total = lines.reduce((sum, line) => sum + line.amount, 0);
  const busy = phase.name === "paying";

  const failed = (error: StripeError | Error | undefined) => setPhase({ name: "error", message: error?.message || t("error") });

  /** Paid (or on its way): to the payment's page. */
  function done(current: Checkout) {
    rememberSecret(current.reference, current.clientSecret);
    onPaid?.();
    onOpenChange(false);
    router.push(`/paiement/${current.reference}`);
  }

  // Each opening (or retry) gets a number: answers of an earlier one are ignored.
  const generation = useRef(0);

  /** The payment is created and the script loaded side by side. */
  function begin() {
    started.current = true;
    const current = ++generation.current;
    const stale = () => current !== generation.current;
    setPhase({ name: "starting" });
    Promise.all([start(), loadStripe(locale)])
      .then(async ([created, js]) => {
        if (stale()) return;
        setCheckout(created);
        setStripe(js);
        // Apple Pay / Google Pay, when this device has it.
        const request = js.paymentRequest({ country: "CH", currency: "chf", total: { label: "PSG Zurich", amount: created.amount } });
        const can = await request.canMakePayment().catch(() => null);
        if (stale()) return;
        if (can?.applePay || can?.googlePay) {
          request.on("paymentmethod", async (event) => {
            setPhase({ name: "paying" });
            const { error, paymentIntent } = await js.confirmCardPayment(created.clientSecret, { payment_method: event.paymentMethod.id }, { handleActions: false });
            if (error) {
              event.complete("fail");
              return failed(error);
            }
            event.complete("success");
            // Some cards still ask for a check (3-D Secure).
            if (paymentIntent?.status === "requires_action") {
              const next = await js.confirmCardPayment(created.clientSecret);
              if (next.error) return failed(next.error);
            }
            done(created);
          });
          setWallet({ request, kind: can.applePay ? "apple" : "google" });
        }
        // Card only: its form is open at once.
        if (!created.savedCard && !can?.applePay && !can?.googlePay && !created.methods.includes("twint")) setCardOpen(true);
        setPhase({ name: "ready" });
      })
      .catch((error: Error & { code?: string }) => {
        if (stale()) return;
        started.current = false;
        // The server's refusals, said plainly (sold out, already paid, payment switched off…).
        const known = ["payments_disabled", "out_of_stock", "already_paid", "product_unavailable", "too_many_requests", "membership_inactive"];
        setPhase({ name: "error", message: error.code && known.includes(error.code) ? t(`errors.${error.code}` as never) : error.message || t("error") });
      });
  }

  useEffect(() => {
    if (open && !started.current) begin();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per opening
  }, [open]);

  // Card form: the secure fields are mounted when it unfolds.
  useEffect(() => {
    if (!cardOpen || !stripe || !numberRef.current || !expiryRef.current || !cvcRef.current) return;
    const origin = window.location.origin;
    const elements = stripe.elements({
      locale,
      fonts: [{ family: "Virage", src: `url(${origin}/brand/email/fonts/Virage-Regular.woff2)`, weight: "400" }],
    });
    const style = fieldStyle();
    const fields = [
      ["number", elements.create("cardNumber", { style, showIcon: true, disableLink: true }), numberRef.current],
      ["expiry", elements.create("cardExpiry", { style }), expiryRef.current],
      ["cvc", elements.create("cardCvc", { style }), cvcRef.current],
    ] as const;
    for (const [name, element, target] of fields) {
      element.mount(target);
      element.on("focus", () => setFocus(name));
      element.on("blur", () => setFocus((current) => (current === name ? null : current)));
      element.on("change", (event) => {
        setComplete((current) => ({ ...current, [name]: event.complete }));
        setFieldError(event.error?.message ?? null);
      });
    }
    cardElement.current = fields[0][1];
    return () => {
      for (const [, element] of fields) element.destroy();
      cardElement.current = null;
    };
  }, [cardOpen, stripe, locale]);

  // Closed: the next opening starts afresh.
  function changeOpen(next: boolean) {
    if (busy) return;
    onOpenChange(next);
    if (!next) {
      started.current = false;
      generation.current++;
      setPhase({ name: "starting" });
      setCheckout(null);
      setWallet(null);
      setCardOpen(false);
    }
  }

  async function paySaved() {
    if (!stripe || !checkout?.savedCard) return;
    setPhase({ name: "paying" });
    const { error } = await stripe.confirmCardPayment(checkout.clientSecret, { payment_method: checkout.savedCard.id });
    if (error) return failed(error);
    done(checkout);
  }

  async function payCard() {
    if (!stripe || !checkout || !cardElement.current) return;
    setPhase({ name: "paying" });
    const { error } = await stripe.confirmCardPayment(checkout.clientSecret, { payment_method: { card: cardElement.current } });
    if (error) return failed(error);
    done(checkout);
  }

  async function payTwint() {
    if (!stripe || !checkout) return;
    setPhase({ name: "paying" });
    rememberSecret(checkout.reference, checkout.clientSecret);
    // Opens TWINT; the payer comes back to the payment's page.
    const { error } = await stripe.confirmTwintPayment(checkout.clientSecret, {
      return_url: `${window.location.origin}/${locale}/paiement/${checkout.reference}`,
    });
    if (error) failed(error);
  }

  const ready = phase.name !== "starting" && checkout !== null && stripe !== null;
  const cardComplete = complete.number && complete.expiry && complete.cvc;

  return (
    <ResponsivePanel open={open} onOpenChange={changeOpen} title={title}>
      <div className="flex flex-col gap-6">
        {/* What is paid, then the total in large. */}
        <div className="space-y-2">
          <ul className="space-y-1.5 text-[14px]">
            {lines.map((line) => (
              <li key={line.label} className="flex items-baseline justify-between gap-4">
                <span className="min-w-0 text-muted-foreground">{line.label}</span>
                <span className="shrink-0 tabular-nums">{formatChf(line.amount)}</span>
              </li>
            ))}
          </ul>
          <div className="flex items-baseline justify-between gap-4 border-t pt-3">
            <span className="font-wide text-[11px] font-semibold tracking-[0.08em] uppercase">{t("total")}</span>
            <span className="font-narrow text-[34px] leading-none font-extrabold tabular-nums italic">{formatChf(total)}</span>
          </div>
        </div>

        {!ready && phase.name !== "error" ? (
          <div className="grid gap-2" aria-busy>
            <p className="sr-only">{t("starting")}</p>
            <div className="skeleton h-12 rounded-[10px]" />
            <div className="skeleton h-12 rounded-[10px]" />
          </div>
        ) : null}

        {phase.name === "error" ? (
          <div role="alert" className="flex flex-col gap-3 rounded-[12px] border border-destructive/30 bg-destructive/5 p-4 text-[14px]">
            <p>{phase.message}</p>
            <button
              type="button"
              onClick={() => (checkout ? setPhase({ name: "ready" }) : begin())}
              className="self-start border-b pb-0.5 text-[13px] font-semibold transition-colors hover:border-brand-red"
            >
              {t("retry")}
            </button>
          </div>
        ) : null}

        {ready ? (
          <div className="flex flex-col gap-2.5" aria-busy={busy || undefined}>
            {checkout.savedCard ? (
              <button type="button" disabled={busy} onClick={paySaved} className={cn(option, "bg-segment text-segment-foreground shadow-brand hover:opacity-90")}>
                {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <CreditCard className="size-4" aria-hidden />}
                {t("savedCard", { brand: BRANDS[checkout.savedCard.brand] ?? checkout.savedCard.brand, last4: checkout.savedCard.last4 })}
              </button>
            ) : null}
            {wallet ? (
              <button type="button" disabled={busy} onClick={() => wallet.request.show()} className={cn(option, "bg-foreground text-background normal-case tracking-normal hover:opacity-90 font-sans text-[15px]")}>
                {wallet.kind === "apple" ? t("applePay") : t("googlePay")}
              </button>
            ) : null}
            {checkout.methods.includes("twint") ? (
              <button type="button" disabled={busy} onClick={payTwint} className={cn(option, "bg-foreground text-background hover:opacity-90")}>
                {t("twint")}
              </button>
            ) : null}

            {/* The card form, folded until asked for (open at once when it is the only way). */}
            <div className="rounded-[12px] border">
              <button
                type="button"
                aria-expanded={cardOpen}
                onClick={() => setCardOpen((value) => !value)}
                className="flex h-12 w-full cursor-pointer items-center gap-2 px-4 text-left text-[14px] font-semibold"
              >
                <CreditCard className="size-4 text-muted-foreground" aria-hidden />
                <span className="flex-1">{t("card")}</span>
                <ChevronDown className={cn("size-4 text-muted-foreground transition-transform duration-300", cardOpen && "rotate-180")} aria-hidden />
              </button>
              <div
                data-open={cardOpen || undefined}
                className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] data-[open]:grid-rows-[1fr] motion-reduce:transition-none"
              >
                <div className="min-h-0 overflow-hidden" inert={!cardOpen}>
                  <div className="grid grid-cols-2 gap-3 px-4 pb-4">
                    <CardField label={t("cardNumber")} mountRef={numberRef} focused={focus === "number"} invalid={false} className="col-span-2" />
                    <CardField label={t("expiry")} mountRef={expiryRef} focused={focus === "expiry"} invalid={false} />
                    <CardField label={t("cvc")} mountRef={cvcRef} focused={focus === "cvc"} invalid={false} />
                    {fieldError ? <p className="col-span-2 text-[13px] text-destructive">{fieldError}</p> : null}
                    <button
                      type="button"
                      disabled={busy || !cardComplete}
                      onClick={payCard}
                      className={cn(option, "col-span-2 mt-1 bg-segment text-segment-foreground shadow-brand hover:opacity-90")}
                    >
                      {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Check className="size-4" aria-hidden />}
                      {busy ? t("processing") : t("payAmount", { amount: formatChf(total) })}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <p className="flex items-center justify-center gap-1.5 text-center text-[12px] text-muted-foreground">
          <Lock className="size-3 shrink-0" aria-hidden />
          {t("secure")}
        </p>
      </div>
    </ResponsivePanel>
  );
}
