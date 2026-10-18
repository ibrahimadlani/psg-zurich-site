import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { OrdersBoard } from "@/components/admin/finances/orders-board";
import { AdminHeader } from "@/components/admin/ui/admin-header";
import { AdminListSkeleton } from "@/components/skeletons";
import { listOrders } from "@/lib/admin/finances-query";
import { Streamed } from "@/components/ui/streamed";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("AdminFinances");
  return { title: t("ordersTitle"), robots: { index: false } };
}

async function Orders() {
  await connection();
  const t = await getTranslations("AdminFinances");
  const orders = await listOrders();
  return (
    <>
      <AdminHeader title={t("ordersTitle")} description={t("ordersDescription")} />
      <OrdersBoard orders={orders} />
    </>
  );
}

export default function OrdersPage() {
  return (
    <Streamed fallback={<AdminListSkeleton />}>
      <Orders />
    </Streamed>
  );
}
