"use client";

import { Check, PackageCheck, Truck } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ResponsivePanel } from "@/components/admin/ui/responsive-panel";
import { StatusPill, type PillTone } from "@/components/admin/ui/status-pill";
import { adminButton, adminCard, adminInput, adminLabel } from "@/components/admin/ui/styles";
import { Link, useRouter } from "@/i18n/navigation";
import { formatChf } from "@/lib/money";
import { formatPaymentReference } from "@/lib/payments/config";
import { cn } from "@/lib/utils";

type Order = {
  id: string;
  paymentId: string;
  reference: number;
  status: "pending" | "paid" | "ready" | "handed_over" | "shipped" | "canceled";
  fulfilment: "pickup" | "shipping";
  shippingAddress: { name: string; street: string; postcode: string; city: string } | null;
  trackingNumber: string | null;
  event: { title: string; startsAt: Date } | null;
  payerName: string;
  amount: number;
  paidAt: Date | null;
  items: { id: string; description: string; quantity: number }[];
};

const TONE: Record<Order["status"], PillTone> = { pending: "neutral", paid: "danger", ready: "warn", handed_over: "ok", shipped: "ok", canceled: "neutral" };

/** The orders to prepare first, then those ready or done; one tap moves each on. */
export function OrdersBoard({ orders }: { orders: Order[] }) {
  const t = useTranslations("AdminFinances");
  const format = useFormatter();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [shipping, setShipping] = useState<Order | null>(null);
  const [tracking, setTracking] = useState("");

  const move = (order: Order, status: Order["status"], trackingNumber?: string) =>
    startTransition(async () => {
      const response = await fetch(`/api/v1/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status, trackingNumber }),
      });
      if (!response.ok) {
        toast.error(t("orderError"));
        return;
      }
      toast.success(t(`orderMoved.${status}` as never));
      setShipping(null);
      setTracking("");
      router.refresh();
    });

  // To prepare: one bag per event (pick-ups), and the parcels to post.
  const toPrepare = orders.filter((order) => order.status === "paid");
  const buckets = new Map<string, { label: string; at: number; orders: Order[] }>();
  for (const order of toPrepare) {
    const key = order.fulfilment === "shipping" ? "shipping" : (order.event?.title ?? "next") + (order.event ? new Date(order.event.startsAt).toISOString() : "");
    const label =
      order.fulfilment === "shipping"
        ? t("bucketShipping")
        : order.event
          ? `${order.event.title} · ${format.dateTime(new Date(order.event.startsAt), { weekday: "short", day: "numeric", month: "short" })}`
          : t("bucketNext");
    const bucket = buckets.get(key) ?? { label, at: order.event ? new Date(order.event.startsAt).getTime() : Number.MAX_SAFE_INTEGER, orders: [] };
    bucket.orders.push(order);
    buckets.set(key, bucket);
  }
  const groups = [
    ...[...buckets.values()].sort((a, b) => a.at - b.at).map((bucket) => ({ key: "toPrepare" as const, label: bucket.label, orders: bucket.orders })),
    { key: "ready" as const, label: null, orders: orders.filter((order) => order.status === "ready") },
    { key: "done" as const, label: null, orders: orders.filter((order) => order.status === "handed_over" || order.status === "shipped") },
  ];

  if (orders.length === 0) return <p className="rounded-[12px] border border-dashed px-4 py-10 text-center text-[14px] text-muted-foreground">{t("noOrders")}</p>;

  return (
    <div className="flex flex-col gap-8">
      {groups.map((group) =>
        group.orders.length ? (
          <section key={`${group.key}-${group.label ?? ""}`} className="space-y-3">
            <h2 className={adminLabel}>
              {t(`orderGroups.${group.key}`)}
              {group.label ? ` · ${group.label}` : ""} · {group.orders.length}
            </h2>
            <ul className="grid gap-2 lg:grid-cols-2">
              {group.orders.map((order) => (
                <li key={order.id} className={cn(adminCard, "flex flex-col gap-3 p-4")}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">{order.payerName}</p>
                      <p className="text-[12px] text-muted-foreground">
                        <Link href={`/admin/finances/payments/${order.paymentId}`} className="font-mono underline-offset-2 hover:underline">
                          {formatPaymentReference(order.reference)}
                        </Link>
                        {order.paidAt ? ` · ${format.dateTime(new Date(order.paidAt), { dateStyle: "medium" })}` : ""} · {formatChf(order.amount)}
                      </p>
                    </div>
                    <StatusPill tone={TONE[order.status]}>{t(`orderStatus.${order.status}` as never)}</StatusPill>
                  </div>
                  <ul className="space-y-0.5 text-[14px]">
                    {order.items.map((item) => (
                      <li key={item.id}>
                        <span className="font-semibold tabular-nums">{item.quantity} ×</span> {item.description}
                      </li>
                    ))}
                  </ul>
                  <p className="text-[13px] text-muted-foreground">
                    {order.fulfilment === "pickup"
                      ? order.event
                        ? `${t("pickup")} · ${order.event.title}`
                        : t("pickup")
                      : `${t("shipTo")} ${order.shippingAddress?.name}, ${order.shippingAddress?.street}, ${order.shippingAddress?.postcode} ${order.shippingAddress?.city}`}
                    {order.trackingNumber ? ` · ${order.trackingNumber}` : ""}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {order.status === "paid" && order.fulfilment === "pickup" ? (
                      <button type="button" disabled={pending} onClick={() => move(order, "ready")} className={adminButton("primary", "sm")}>
                        <PackageCheck aria-hidden />
                        {t("markReady")}
                      </button>
                    ) : null}
                    {order.status === "paid" && order.fulfilment === "shipping" ? (
                      <button type="button" disabled={pending} onClick={() => setShipping(order)} className={adminButton("primary", "sm")}>
                        <Truck aria-hidden />
                        {t("markShipped")}
                      </button>
                    ) : null}
                    {(order.status === "paid" || order.status === "ready") && order.fulfilment === "pickup" ? (
                      <button type="button" disabled={pending} onClick={() => move(order, "handed_over")} className={adminButton("secondary", "sm")}>
                        <Check aria-hidden />
                        {t("markHandedOver")}
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null,
      )}
      <ResponsivePanel
        open={shipping !== null}
        onOpenChange={(open) => (open ? null : setShipping(null))}
        title={t("markShipped")}
        footer={
          <button type="button" disabled={pending || !shipping} onClick={() => shipping && move(shipping, "shipped", tracking.trim() || undefined)} className={adminButton("primary")}>
            <Truck aria-hidden />
            {t("markShipped")}
          </button>
        }
      >
        <label className="flex flex-col gap-1.5">
          <span className={adminLabel}>{t("tracking")}</span>
          <input value={tracking} onChange={(event) => setTracking(event.target.value)} placeholder="99.00.123456.12345678" className={adminInput} />
          <span className="text-[12px] text-muted-foreground">{t("trackingHint")}</span>
        </label>
      </ResponsivePanel>
    </div>
  );
}
