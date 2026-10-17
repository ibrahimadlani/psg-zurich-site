import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { Suspense } from "react";
import { CheckoutForm } from "@/components/shop/checkout-form";
import { redirect } from "@/i18n/navigation";
import { redirectToSignIn } from "@/lib/auth-redirect";
import { notFound } from "next/navigation";
import { getShopSettings, pickupEvents, shopIsOpen } from "@/lib/payments/shop";
import { shopVisitor } from "@/lib/payments/shop-access";
import { getSession } from "@/lib/permissions";

export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Checkout");
  return { title: t("title"), robots: { index: false } };
}

/** Finishing an order: contact, how to get it, payment — with the summary beside. */
async function Checkout() {
  await connection();
  const [{ access, profile }, session, locale] = await Promise.all([shopVisitor(), getSession(), getLocale()]);
  if (access === "guest" || !session) return redirectToSignIn();
  if (access !== "member") return redirect({ href: "/shop", locale });
  if (!(await shopIsOpen())) notFound();
  const [settings, events] = await Promise.all([getShopSettings(), pickupEvents()]);
  return (
    <CheckoutForm
      contact={{ name: profile?.name ?? session.user.name, email: session.user.email }}
      address={profile ?? { name: session.user.name, street: "", postcode: "", city: "" }}
      shipping={{ fee: settings.shippingFee, enabled: settings.shippingEnabled }}
      events={events.map((event) => ({ ...event, startsAt: event.startsAt.toISOString() }))}
    />
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="skeleton h-96 rounded-[16px]" aria-hidden />}>
      <Checkout />
    </Suspense>
  );
}
