import { ArrowLeft, ExternalLink, FileText, MapPin, Package, ShoppingBag } from "lucide-react";
import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { PageHeader } from "@/components/page-header";
import { OrderTimeline } from "@/components/shop/order-timeline";
import { Link } from "@/i18n/navigation";
import { redirectToSignIn } from "@/lib/auth-redirect";
import { getCurrentMember } from "@/lib/members";
import { formatChf } from "@/lib/money";
import { formatPaymentReference } from "@/lib/payments/config";
import { memberOrders } from "@/lib/payments/history";
import { getSession } from "@/lib/permissions";
import { OrdersSkeleton } from "@/components/skeletons";
import { Streamed } from "@/components/ui/skeleton";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Orders");
  return { title: t("title"), robots: { index: false } };
}

/** Every shop order of the member with where it stands, and how to get it. */
async function Orders() {
  await connection();
  const [t, format, session, member] = await Promise.all([getTranslations("Orders"), getFormatter(), getSession(), getCurrentMember()]);
  if (!session) return redirectToSignIn();
  const orders = member ? await memberOrders(member.id) : [];
  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-[16px] border border-dashed px-6 py-14 text-center">
        <ShoppingBag className="size-6 text-muted-foreground" aria-hidden />
        <p className="text-[15px] text-muted-foreground">{t("empty")}</p>
        <Link href="/shop" className="border-b border-psg-red pb-0.5 text-[14px] font-semibold">
          {t("toShop")}
        </Link>
      </div>
    );
  }
  return (
    <ul className="flex flex-col gap-4">
      {orders.map((order) => (
        <li key={order.id} className="flex flex-col gap-5 rounded-[16px] border bg-card p-4 shadow-brand sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-wide text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                {formatPaymentReference(order.reference)}
                {order.paidAt ? ` · ${format.dateTime(order.paidAt, { dateStyle: "medium" })}` : ""}
              </p>
              <p className="mt-1 font-narrow text-[26px] leading-none font-extrabold tabular-nums italic">{formatChf(order.amount)}</p>
            </div>
            {order.receiptNumber ? (
              <a href={`/api/v1/receipts/${order.receiptNumber}`} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12px] font-semibold transition-colors hover:border-foreground/30">
                <FileText className="size-3.5" aria-hidden />
                {order.receiptNumber}
              </a>
            ) : null}
          </div>
          <OrderTimeline order={order} />
          <ul className="flex flex-col gap-3 border-t pt-4">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-center gap-3">
                <span className="size-12 shrink-0 overflow-hidden rounded-[10px] bg-foreground/[0.05]">
                  {item.image ? (
                    // eslint-disable-next-line @next/next/no-img-element -- stored media
                    <img src={`/api/v1/media/${item.image}`} alt="" className="size-full object-cover" />
                  ) : null}
                </span>
                <span className="min-w-0 flex-1 text-[14px]">
                  {item.slug ? (
                    <Link href={`/shop/${item.slug}`} className="font-semibold hover:underline">
                      {item.description}
                    </Link>
                  ) : (
                    <span className="font-semibold">{item.description}</span>
                  )}
                  <span className="block text-[12px] text-muted-foreground">× {item.quantity}</span>
                </span>
                <span className="text-[14px] tabular-nums">{formatChf(item.total)}</span>
              </li>
            ))}
          </ul>
          <p className="flex items-start gap-2 rounded-[12px] bg-foreground/[0.03] px-3.5 py-3 text-[13px]">
            {order.fulfilment === "pickup" ? <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden /> : <Package className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />}
            <span className="min-w-0">
              {order.fulfilment === "pickup"
                ? order.event
                  ? t("pickupAt", { event: order.event.title, date: format.dateTime(order.event.startsAt, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) })
                  : t("pickupNext")
                : t("shipTo", { address: order.shippingAddress ? `${order.shippingAddress.street}, ${order.shippingAddress.postcode} ${order.shippingAddress.city}` : "—" })}
              {order.trackingNumber ? (
                <a href={`https://service.post.ch/ekp-web/ui/entry/shipment/${encodeURIComponent(order.trackingNumber)}`} target="_blank" rel="noreferrer" className="mt-1 flex items-center gap-1 font-semibold underline-offset-2 hover:underline">
                  {t("track", { number: order.trackingNumber })}
                  <ExternalLink className="size-3" aria-hidden />
                </a>
              ) : null}
            </span>
          </p>
        </li>
      ))}
    </ul>
  );
}

export default async function OrdersPage() {
  const t = await getTranslations("Orders");
  return (
    <div className="flex flex-col gap-6">
      <Link href="/member" prefetch={false} className="inline-flex items-center gap-1.5 self-start text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden />
        {t("back")}
      </Link>
      <PageHeader title={t("title")} description={t("description")} />
      <Streamed fallback={<OrdersSkeleton />}>
        <Orders />
      </Streamed>
    </div>
  );
}
