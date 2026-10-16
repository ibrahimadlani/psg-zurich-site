import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { Suspense } from "react";
import { ProductsAdmin } from "@/components/admin/finances/products-admin";
import { AdminHeader } from "@/components/admin/ui/admin-header";
import { AdminListSkeleton } from "@/components/skeletons";
import type { Locale } from "@/db/schema";
import { shopProducts } from "@/lib/payments/shop";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("AdminFinances");
  return { title: t("shopTitle"), robots: { index: false } };
}

async function Products() {
  await connection();
  const [t, locale] = await Promise.all([getTranslations("AdminFinances"), getLocale()]);
  const products = await shopProducts(locale as Locale, { all: true });
  return (
    <>
      <AdminHeader title={t("shopTitle")} description={t("shopDescription")} />
      <ProductsAdmin products={products} />
    </>
  );
}

export default function ShopAdminPage() {
  return (
    <Suspense fallback={<AdminListSkeleton />}>
      <Products />
    </Suspense>
  );
}
