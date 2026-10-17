import { getTranslations } from "next-intl/server";
import { BareTopBar } from "@/components/bare-top-bar";
import { LegalNav } from "@/components/legal/legal-nav";

/**
 * Checkout: the frame of the status and legal pages (slim bar, the documents at the end), so
 * nothing distracts from finishing the order; the way back leads to the shop.
 */
export default async function CheckoutLayout({ children }: LayoutProps<"/[locale]">) {
  const t = await getTranslations("Shop");
  return (
    <div data-bare-page="" className="relative flex flex-1 flex-col leading-[normal]">
      <BareTopBar back={{ href: "/shop", label: t("title") }} />
      <main className="mx-auto w-full max-w-5xl flex-1 animate-page-in px-4 pt-6 pb-10 motion-reduce:animate-none">{children}</main>
      <LegalNav />
    </div>
  );
}
