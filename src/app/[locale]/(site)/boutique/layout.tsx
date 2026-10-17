import { Lock } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { Suspense } from "react";
import { redirectToSignIn } from "@/lib/auth-redirect";
import { shopVisitor } from "@/lib/payments/shop-access";

/**
 * The shop is for members: visitors go to sign-in (and come back here), accounts waiting for
 * the committee see why it is closed. (The bag is in the site header.)
 */
async function ShopGate({ children }: { children: React.ReactNode }) {
  await connection();
  const { access } = await shopVisitor();
  if (access === "guest") return redirectToSignIn();
  if (access === "pending") {
    const t = await getTranslations("Shop");
    return (
      <div className="mx-auto flex min-h-[50svh] max-w-md flex-col items-center justify-center gap-4 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-psg-blue text-white shadow-brand">
          <Lock className="size-5" aria-hidden />
        </span>
        <h1 className="font-narrow text-[length:clamp(32px,7vw,44px)] leading-[0.95] font-extrabold uppercase italic">{t("pendingTitle")}</h1>
        <p className="text-[15px] text-pretty text-muted-foreground">{t("pendingBody")}</p>
      </div>
    );
  }
  return children;
}

export default function ShopLayout({ children }: LayoutProps<"/[locale]/boutique">) {
  return (
    <Suspense fallback={<div className="skeleton mx-auto h-64 w-full max-w-5xl rounded-[16px]" aria-hidden />}>
      <ShopGate>{children}</ShopGate>
    </Suspense>
  );
}
