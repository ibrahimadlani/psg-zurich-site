import { connection } from "next/server";
import { Suspense } from "react";
import { ShopCart } from "@/components/shop/shop-cart";
import { shopVisitor } from "@/lib/payments/shop-access";
import { getShopSettings } from "@/lib/payments/shop";

/** The bag floats over every shop page. */
async function Cart() {
  await connection();
  const [{ access, profile }, settings] = await Promise.all([shopVisitor(), getShopSettings()]);
  return <ShopCart access={access} profile={profile} shipping={{ fee: settings.shippingFee, enabled: settings.shippingEnabled }} />;
}

export default function ShopLayout({ children }: LayoutProps<"/[locale]/boutique">) {
  return (
    <>
      {children}
      <Suspense fallback={null}>
        <Cart />
      </Suspense>
    </>
  );
}
