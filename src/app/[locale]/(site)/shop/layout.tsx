import { Lock } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { redirectToSignIn } from "@/lib/auth-redirect";
import { shopIsOpen } from "@/lib/payments/shop";
import { shopVisitor } from "@/lib/payments/shop-access";
import { getSession } from "@/lib/permissions";
import { can } from "@/lib/roles";
import { notFound } from "next/navigation";
import { ShopSkeleton } from "@/components/skeletons";
import { Streamed } from "@/components/ui/streamed";

/**
 * The shop is for members: visitors go to sign-in (and come back here), accounts waiting for
 * the committee see why it is closed. (The bag is in the site header.)
 */
async function ShopGate({ children }: { children: React.ReactNode }) {
  await connection();
  const [{ access }, open, session] = await Promise.all([shopVisitor(), shopIsOpen(), getSession()]);
  if (access === "guest") return redirectToSignIn();
  // Closed (or nothing on sale): as if it did not exist, except for the committee preparing it.
  if (!open && !(session && can(session.user.role, "finances"))) notFound();
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

export default function ShopLayout({ children }: LayoutProps<"/[locale]/shop">) {
  return (
    <Streamed fallback={<ShopSkeleton />}>
      <ShopGate>{children}</ShopGate>
    </Streamed>
  );
}
