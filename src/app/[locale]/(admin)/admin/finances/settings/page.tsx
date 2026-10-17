import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { Suspense } from "react";
import { FinanceSettings } from "@/components/admin/finances/finance-settings";
import { AdminHeader } from "@/components/admin/ui/admin-header";
import { AdminListSkeleton } from "@/components/skeletons";
import { currentSeason, seasonRates } from "@/lib/payments/dues-price";
import { activeProductCount, getShopSettings } from "@/lib/payments/shop";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("AdminFinances");
  return { title: t("settingsTitle"), robots: { index: false } };
}

const nextSeason = (season: string) => {
  const start = Number(season.slice(0, 4)) + 1;
  return `${start}/${String(start + 1).slice(2)}`;
};

async function Settings() {
  await connection();
  const t = await getTranslations("AdminFinances");
  const season = currentSeason();
  const [current, next, shop] = await Promise.all([seasonRates(season), seasonRates(nextSeason(season)), getShopSettings()]);
  return (
    <>
      <AdminHeader title={t("settingsTitle")} description={t("settingsDescription")} />
      <FinanceSettings seasons={[current, next]} shipping={{ fee: shop.shippingFee, enabled: shop.shippingEnabled }} shop={{ enabled: shop.shopEnabled, products: await activeProductCount() }} />
    </>
  );
}

export default function FinanceSettingsPage() {
  return (
    <Suspense fallback={<AdminListSkeleton />}>
      <Settings />
    </Suspense>
  );
}
