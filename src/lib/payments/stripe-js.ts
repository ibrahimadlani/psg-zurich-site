"use client";

import { PUBLISHABLE_KEY } from "@/lib/payments/config";

/*
 * The payment provider's browser script, loaded from its own address the first time a payment
 * form opens (it must come from there: card numbers are typed into its secure fields, never
 * into ours). Only what the site uses is typed here.
 */

export type StripeError = { message?: string; code?: string; type?: string };
type IntentResult = { error?: StripeError; paymentIntent?: { id: string; status: string } };

export type StripeElement = {
  mount(target: HTMLElement): void;
  destroy(): void;
  on(event: "change", handler: (event: { complete: boolean; empty: boolean; error?: StripeError }) => void): void;
  on(event: "focus" | "blur" | "ready", handler: () => void): void;
};

type ElementStyle = Record<string, unknown>;

export type StripeElements = {
  create(type: "cardNumber" | "cardExpiry" | "cardCvc", options: { style: ElementStyle; placeholder?: string; showIcon?: boolean; disableLink?: boolean }): StripeElement;
};

export type PaymentRequest = {
  canMakePayment(): Promise<{ applePay?: boolean; googlePay?: boolean } | null>;
  show(): void;
  on(
    event: "paymentmethod",
    handler: (event: { paymentMethod: { id: string }; complete(status: "success" | "fail"): void }) => void,
  ): void;
  on(event: "cancel", handler: () => void): void;
};

export type StripeJs = {
  elements(options: { fonts?: { family: string; src: string; weight?: string }[]; locale?: string }): StripeElements;
  confirmCardPayment(clientSecret: string, data?: { payment_method: string | { card: StripeElement } }, options?: { handleActions?: boolean }): Promise<IntentResult>;
  confirmTwintPayment(clientSecret: string, data: { return_url: string }): Promise<IntentResult>;
  paymentRequest(options: { country: string; currency: string; total: { label: string; amount: number }; requestPayerName?: boolean; requestPayerEmail?: boolean }): PaymentRequest;
};

declare global {
  interface Window {
    Stripe?: (key: string, options?: { locale?: string }) => StripeJs;
  }
}

const SCRIPT = "https://js.stripe.com/v3/";
let loading: Promise<StripeJs> | null = null;

export function loadStripe(locale: string): Promise<StripeJs> {
  loading ??= new Promise<StripeJs>((resolve, reject) => {
    const ready = () => (window.Stripe ? resolve(window.Stripe(PUBLISHABLE_KEY, { locale })) : reject(new Error("Payment script unavailable.")));
    if (window.Stripe) return ready();
    const script = document.createElement("script");
    script.src = SCRIPT;
    script.async = true;
    script.onload = ready;
    script.onerror = () => {
      loading = null;
      reject(new Error("Payment script unavailable."));
    };
    document.head.append(script);
  });
  return loading;
}

/** Remembers the checkout secret of a payment for its status page (visitors have no account). */
export const rememberSecret = (reference: string, secret: string) => {
  try {
    sessionStorage.setItem(`payment:${reference}`, secret);
  } catch {
    // Private mode: the status page falls back on the address the provider sends back.
  }
};
export const recallSecret = (reference: string) => {
  try {
    return sessionStorage.getItem(`payment:${reference}`);
  } catch {
    return null;
  }
};
