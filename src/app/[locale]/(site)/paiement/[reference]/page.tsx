import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PaymentStatusView } from "@/components/payments/payment-status";

// Payment pages only exist at runtime.
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("PaymentStatus");
  return { title: t("title"), robots: { index: false, follow: false }, referrer: "no-referrer" };
}

/** Where a payment lands (on the page, or back from TWINT / a 3-D Secure check). */
export default async function PaymentPage({ params }: PageProps<"/[locale]/paiement/[reference]">) {
  const { reference } = await params;
  return <PaymentStatusView reference={reference} />;
}
