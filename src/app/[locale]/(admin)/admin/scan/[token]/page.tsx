import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";

// Tokens only exist at runtime.
export const instant = false;

/**
 * Where a member card's QR code points (scanned with the phone's own camera): the in-app
 * scanner, which shows the card at once and lets the member in.
 */
export default async function ScanPage({ params }: PageProps<"/[locale]/admin/scan/[token]">) {
  const { token } = await params;
  redirect({ href: `/admin/scanner?carte=${encodeURIComponent(token)}`, locale: await getLocale() });
}
