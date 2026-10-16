"use client";

import { Check, Clock, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { formatChf } from "@/lib/money";
import { cart } from "@/components/shop/cart-store";
import { recallSecret } from "@/lib/payments/stripe-js";
import { cn } from "@/lib/utils";

type Status = { status: string; kind: "dues" | "shop" | "donation"; amount: number; receiptNumber: string | null; method: string | null };

const POLL_MS = 1500;
const POLL_FOR_MS = 45_000;

/**
 * The payment's page: asks where the payment stands until it is settled (the server checks
 * with the provider itself), then says thank you and what comes next.
 */
export function PaymentStatusView({ reference }: { reference: string }) {
  const t = useTranslations("PaymentStatus");
  const [state, setState] = useState<Status | "missing" | null>(null);

  useEffect(() => {
    // Visitors prove the payment is theirs with the secret of the checkout: kept by the sheet,
    // or added to the address by the provider on the way back from TWINT.
    const fromUrl = new URLSearchParams(window.location.search).get("payment_intent_client_secret");
    const secret = fromUrl ?? recallSecret(reference);
    const query = secret ? `?secret=${encodeURIComponent(secret)}` : "";
    const until = Date.now() + POLL_FOR_MS;
    let timer: number | undefined;
    let stopped = false;

    const poll = async () => {
      const response = await fetch(`/api/v1/payments/${encodeURIComponent(reference)}${query}`, { cache: "no-store" }).catch(() => null);
      if (stopped) return;
      if (response?.status === 404) return setState("missing");
      const body = response?.ok ? ((await response.json()) as { data: Status }) : null;
      if (body) setState(body.data);
      // Back from TWINT with an order paid: its cart is done.
      if (body?.data.kind === "shop" && body.data.status === "succeeded") cart.clear();
      const settled = body && !["pending", "processing"].includes(body.data.status);
      if (!settled && Date.now() < until) timer = window.setTimeout(poll, POLL_MS);
    };
    void poll();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [reference]);

  if (state === "missing") {
    return (
      <Panel tone="muted" icon={<X className="size-6" aria-hidden />} title={t("notFound")}>
        <Link href="/" className={secondary}>
          {t("toHome")}
        </Link>
      </Panel>
    );
  }

  if (!state || state.status === "pending" || state.status === "processing") {
    const slow = state?.status === "processing";
    return (
      <Panel tone="muted" icon={<Clock className="size-6 animate-pulse" aria-hidden />} title={slow ? t("processingTitle") : t("checking")} reference={reference}>
        <p className="text-[15px] text-pretty text-muted-foreground">{slow ? t("processingBody") : t("checkingBody")}</p>
      </Panel>
    );
  }

  if (state.status === "succeeded" || state.status === "partially_refunded" || state.status === "refunded") {
    const next =
      state.kind === "dues" ? { href: "/evenements", label: t("toEvents") } : state.kind === "shop" ? { href: "/espace-membre", label: t("toMemberArea") } : { href: "/", label: t("toHome") };
    return (
      <Panel tone="ok" icon={<Check className="size-7" strokeWidth={2.5} aria-hidden />} title={t("succeededTitle")} reference={reference}>
        <p className="text-[15px] text-pretty text-muted-foreground">{t(`${state.kind}Body`)}</p>
        <dl className="grid w-full grid-cols-2 gap-3 rounded-[12px] border bg-card p-4 text-left text-[14px]">
          <div>
            <dt className={term}>{t("amount")}</dt>
            <dd className="tabular-nums">{formatChf(state.amount)}</dd>
          </div>
          {state.receiptNumber ? (
            <div>
              <dt className={term}>{t("receipt")}</dt>
              <dd className="font-mono text-[13px]">{state.receiptNumber}</dd>
            </div>
          ) : null}
        </dl>
        <Link href={next.href} className={primary}>
          {next.label}
        </Link>
      </Panel>
    );
  }

  return (
    <Panel tone="error" icon={<X className="size-6" aria-hidden />} title={state.status === "canceled" ? t("canceledTitle") : t("failedTitle")} reference={reference}>
      <p className="text-[15px] text-pretty text-muted-foreground">{t("failedBody")}</p>
      <Link href={state.kind === "dues" ? "/cotisation" : state.kind === "donation" ? "/soutenir" : "/boutique"} className={primary}>
        {t("retry")}
      </Link>
    </Panel>
  );
}

const term = "font-wide text-[10px] font-semibold tracking-[0.06em] text-muted-foreground uppercase";
const primary =
  "inline-flex h-12 w-full items-center justify-center rounded-[10px] bg-segment px-6 font-wide text-[12px] font-semibold tracking-[0.06em] text-segment-foreground uppercase shadow-brand transition-opacity hover:opacity-90 sm:w-auto";
const secondary = "border-b pb-0.5 text-[14px] transition-colors hover:border-brand-red";

function Panel({
  tone,
  icon,
  title,
  reference,
  children,
}: {
  tone: "ok" | "error" | "muted";
  icon: React.ReactNode;
  title: string;
  reference?: string;
  children: React.ReactNode;
}) {
  const t = useTranslations("PaymentStatus");
  return (
    <div className="mx-auto flex min-h-[50svh] max-w-md animate-page-in flex-col items-center justify-center gap-5 py-6 text-center motion-reduce:animate-none">
      <span
        className={cn(
          "grid size-16 animate-in place-items-center rounded-full zoom-in-75 fade-in-0 duration-500",
          tone === "ok" ? "bg-ok text-white" : tone === "error" ? "bg-destructive/10 text-destructive" : "bg-foreground/5 text-muted-foreground",
        )}
      >
        {icon}
      </span>
      <h1 className="font-narrow text-[length:clamp(36px,8vw,52px)] leading-[0.95] font-extrabold uppercase italic">{title}</h1>
      {reference ? (
        <p className="font-wide text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
          {t("reference")} {reference}
        </p>
      ) : null}
      {children}
    </div>
  );
}
