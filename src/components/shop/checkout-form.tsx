"use client";

import { ArrowRight, Check, ChevronDown, Lock, MapPin, Package, ShoppingBag, TriangleAlert } from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { AddressAutocomplete } from "@/components/maps/address-autocomplete";
import { PaySheet } from "@/components/payments/pay-sheet";
import { RollingNumber } from "@/components/shop/rolling-number";
import { cart, cartTotal, readCart, useCart, type CartItem } from "@/components/shop/cart-store";
import { Link } from "@/i18n/navigation";
import { formatChf } from "@/lib/money";
import { startPayment } from "@/lib/payments/client";
import { cn } from "@/lib/utils";

type Address = { name: string; street: string; postcode: string; city: string };
type PickupEvent = { id: string; title: string; type: string; startsAt: string; location: string | null };
type Checked = { variantId: string; quantity: number; gone: boolean; available: number; name?: string; size?: string; price?: number; image?: string | null; slug?: string };

const field =
  "h-12 w-full rounded-[10px] border bg-card px-3.5 text-[16px] outline-none [transition:border-color_.2s,box-shadow_.2s] placeholder:text-muted-foreground focus:border-primary focus:shadow-[0_0_0_3px_oklch(0.62_0.13_248/0.2)] aria-invalid:border-destructive sm:text-[15px]";
const label = "font-wide text-[10px] font-semibold tracking-[0.06em] text-muted-foreground uppercase";
const primary =
  "inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-segment px-6 font-wide text-[12px] font-semibold tracking-[0.06em] text-segment-foreground uppercase shadow-brand [transition:opacity_.2s,transform_.15s] hover:opacity-90 active:scale-[0.98] disabled:cursor-default disabled:opacity-50";

/** A numbered step of the page. */
function Step({ number, title, done, children }: { number: number; title: string; done?: boolean; children: React.ReactNode }) {
  return (
    <section className="flex gap-4">
      <span
        className={cn(
          "grid size-7 shrink-0 place-items-center rounded-full text-[12px] font-bold transition-colors duration-300",
          done ? "bg-ok text-white" : "bg-foreground text-background",
        )}
        aria-hidden
      >
        {done ? <Check className="size-3.5" strokeWidth={3} /> : number}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-4 pb-8">
        <h2 className="pt-0.5 font-wide text-[12px] font-semibold tracking-[0.08em] uppercase">{title}</h2>
        {children}
      </div>
    </section>
  );
}

/** A big choice (pick-up or post): radio, title, price, a line of explanation. */
function Option({ checked, onSelect, title, price, body, icon: Icon }: { checked: boolean; onSelect: () => void; title: string; price: string; body: string; icon: typeof MapPin }) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-[12px] border p-4 transition-[border-color,background-color,box-shadow]",
        checked ? "border-foreground/50 bg-foreground/[0.03] shadow-[0_0_0_1px_var(--color-foreground)]/10" : "hover:border-foreground/25",
      )}
    >
      <input type="radio" checked={checked} onChange={onSelect} className="mt-1 size-4 accent-[var(--color-psg-blue)]" />
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-3 text-[15px] font-semibold">
          {title}
          <span className="shrink-0 font-normal tabular-nums">{price}</span>
        </span>
        <span className="mt-0.5 block text-[13px] text-pretty text-muted-foreground">{body}</span>
      </span>
    </label>
  );
}

/** The order's lines and totals (beside the steps on a computer, folded on top on a phone). */
function Summary({ items, postage, shippingLabel }: { items: CartItem[]; postage: number | null; shippingLabel: string }) {
  const t = useTranslations("Checkout");
  const subtotal = cartTotal(items);
  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li key={item.variantId} className="flex items-center gap-3">
            <span className="relative size-14 shrink-0 overflow-hidden rounded-[10px] bg-foreground/[0.05]">
              {item.image ? (
                // eslint-disable-next-line @next/next/no-img-element -- stored media
                <img src={`/api/v1/media/${item.image}`} alt="" className="size-full object-cover" />
              ) : null}
              <span className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-foreground px-1 text-[10px] font-bold text-background tabular-nums">{item.quantity}</span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-semibold">{item.name}</span>
              {item.size ? <span className="block text-[12px] text-muted-foreground">{item.size}</span> : null}
            </span>
            <span className="shrink-0 text-[14px] tabular-nums">{formatChf(item.price * item.quantity)}</span>
          </li>
        ))}
      </ul>
      <dl className="flex flex-col gap-2 border-t pt-4 text-[14px]">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">{t("subtotal")}</dt>
          <dd className="tabular-nums">{formatChf(subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">{shippingLabel}</dt>
          <dd className="tabular-nums">{postage === null ? "—" : postage === 0 ? t("free") : formatChf(postage)}</dd>
        </div>
        <div className="flex items-baseline justify-between border-t pt-3">
          <dt className="font-semibold">{t("total")}</dt>
          <dd>
            <RollingNumber value={subtotal + (postage ?? 0)} className="font-narrow text-[30px] leading-none font-extrabold tabular-nums italic">
              {formatChf(subtotal + (postage ?? 0))}
            </RollingNumber>
          </dd>
        </div>
      </dl>
    </div>
  );
}

/**
 * The checkout: the bag is checked against the shop first (prices, what is left), then three
 * plain steps — who, how to get it (an event or the post), pay — with the summary beside.
 */
export function CheckoutForm({ contact, address: initialAddress, shipping, events }: { contact: { name: string; email: string }; address: Address; shipping: { fee: number; enabled: boolean }; events: PickupEvent[] }) {
  const t = useTranslations("Checkout");
  const tEvents = useTranslations("Events");
  const format = useFormatter();
  const locale = useLocale();
  const items = useCart();
  const [checked, setChecked] = useState<"checking" | "ok">("checking");
  const [notices, setNotices] = useState<string[]>([]);
  const [mode, setMode] = useState<"pickup" | "shipping">(events.length ? "pickup" : "shipping");
  const [eventId, setEventId] = useState<string | null>(events[0]?.id ?? null);
  const [address, setAddress] = useState<Address>(initialAddress);
  const [errors, setErrors] = useState<Partial<Record<keyof Address, boolean>>>({});
  const [paying, setPaying] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);

  // The bag as the shop sees it now: sold-out pieces leave, quantities follow the stock.
  useEffect(() => {
    // Read from the store: on the first render the bag is not hydrated yet.
    const current = readCart();
    if (current.length === 0) {
      // After this render (no state change inside the effect itself).
      queueMicrotask(() => setChecked("ok"));
      return;
    }
    let stale = false;
    fetch("/api/v1/shop/cart", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ locale, items: current.map(({ variantId, quantity }) => ({ variantId, quantity })) }),
    })
      .then((response) => (response.ok ? (response.json() as Promise<{ data: Checked[] }>) : null))
      .then((body) => {
        if (stale || !body) return;
        const messages: string[] = [];
        const fixed = current.flatMap((item) => {
          const fresh = body.data.find((line) => line.variantId === item.variantId);
          if (!fresh || fresh.gone || fresh.available === 0) {
            messages.push(t("noticeGone", { name: item.name }));
            return [];
          }
          const quantity = Math.min(item.quantity, fresh.available);
          if (quantity < item.quantity) messages.push(t("noticeFewer", { name: item.name, count: fresh.available }));
          if (fresh.price !== undefined && fresh.price !== item.price) messages.push(t("noticePrice", { name: item.name, price: formatChf(fresh.price) }));
          return [{ ...item, quantity, max: fresh.available, price: fresh.price ?? item.price, name: fresh.name ?? item.name, image: fresh.image ?? item.image }];
        });
        // Always written back: the bag learns today's stock even when nothing had to change.
        cart.replace(fixed);
        if (messages.length) setNotices(messages);
        setChecked("ok");
      })
      .catch(() => setChecked("ok"));
    return () => {
      stale = true;
    };
    // Checked once, when the page opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const postage = mode === "shipping" ? shipping.fee : 0;
  const total = cartTotal(items) + postage;
  const deliveryReady = mode === "pickup" ? Boolean(eventId) : Boolean(address.name.trim() && address.street.trim().length >= 3 && /^\d{4}$/.test(address.postcode.trim()) && address.city.trim());

  function pay() {
    if (mode === "shipping") {
      const next = { name: !address.name.trim(), street: address.street.trim().length < 3, postcode: !/^\d{4}$/.test(address.postcode.trim()), city: !address.city.trim() };
      setErrors(next);
      if (Object.values(next).some(Boolean)) return;
    }
    if (mode === "pickup" && !eventId) return;
    setPaying(true);
  }

  if (checked === "ok" && items.length === 0) {
    return (
      <div className="mx-auto flex min-h-[50svh] max-w-sm flex-col items-center justify-center gap-4 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-foreground/[0.05]">
          <ShoppingBag className="size-6 text-muted-foreground" aria-hidden />
        </span>
        <h1 className="font-narrow text-[36px] leading-none font-extrabold uppercase italic">{t("emptyTitle")}</h1>
        {notices.length ? <p className="text-[14px] text-muted-foreground">{notices.join(" ")}</p> : null}
        <Link href="/boutique" className="inline-flex items-center gap-1.5 border-b border-psg-red pb-0.5 text-[14px] font-semibold">
          {t("backToShop")}
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>
    );
  }

  const shippingLabel = mode === "shipping" ? t("postage") : t("pickup");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-narrow text-[length:clamp(40px,8vw,64px)] leading-[0.9] font-extrabold uppercase italic">{t("title")}</h1>

      {/* Phone: the summary, folded on top. */}
      <div className="rounded-[14px] border bg-card lg:hidden">
        <button type="button" aria-expanded={summaryOpen} onClick={() => setSummaryOpen((value) => !value)} className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3.5 text-[14px]">
          <span className="flex items-center gap-2 font-semibold">
            <ShoppingBag className="size-4" aria-hidden />
            {summaryOpen ? t("hideSummary") : t("showSummary")}
            <ChevronDown className={cn("size-4 transition-transform duration-300", summaryOpen && "rotate-180")} aria-hidden />
          </span>
          <span className="font-semibold tabular-nums">{formatChf(total)}</span>
        </button>
        <div data-open={summaryOpen || undefined} className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] data-[open]:grid-rows-[1fr] motion-reduce:transition-none">
          <div className="min-h-0 overflow-hidden" inert={!summaryOpen}>
            <div className="border-t px-4 py-4">
              <Summary items={items} postage={postage} shippingLabel={shippingLabel} />
            </div>
          </div>
        </div>
      </div>

      {notices.length ? (
        <div role="status" className="flex animate-in gap-3 rounded-[12px] border border-amber-500/40 bg-amber-500/10 p-4 text-[14px] fade-in-0 slide-in-from-top-2 duration-300">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
          <ul className="space-y-1">
            {notices.map((notice) => (
              <li key={notice}>{notice}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* minmax(0,…): long event names truncate instead of widening the page on a phone. */}
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-12">
        <div className="flex min-w-0 flex-col">
          <Step number={1} title={t("contactTitle")} done>
            <div className="rounded-[12px] border bg-card px-4 py-3.5 text-[14px]">
              <p className="font-semibold">{contact.name}</p>
              <p className="text-muted-foreground">{contact.email}</p>
            </div>
            <p className="text-[13px] text-muted-foreground">{t("contactHint")}</p>
          </Step>

          <Step number={2} title={t("deliveryTitle")} done={deliveryReady}>
            <div className="flex flex-col gap-2.5">
              {events.length ? (
                <Option checked={mode === "pickup"} onSelect={() => setMode("pickup")} icon={MapPin} title={t("pickupTitle")} price={t("free")} body={t("pickupBody")} />
              ) : null}
              {shipping.enabled ? (
                <Option checked={mode === "shipping"} onSelect={() => setMode("shipping")} icon={Package} title={t("shippingTitle")} price={formatChf(shipping.fee)} body={t("shippingBody")} />
              ) : null}
              {!events.length && !shipping.enabled ? <p className="text-[14px] text-muted-foreground">{t("noDelivery")}</p> : null}
            </div>

            {/* The chosen way: which event, or the address. */}
            <div key={mode} className="animate-in fade-in-0 slide-in-from-top-1 duration-300 motion-reduce:animate-none">
              {mode === "pickup" && events.length ? (
                <fieldset className="flex flex-col gap-2">
                  <legend className={cn(label, "mb-2")}>{t("pickupWhere")}</legend>
                  {events.map((event) => {
                    const date = new Date(event.startsAt);
                    return (
                      <label key={event.id} className={cn("flex cursor-pointer items-center gap-3 rounded-[12px] border px-4 py-3 transition-colors", eventId === event.id ? "border-foreground/50 bg-foreground/[0.03]" : "hover:border-foreground/25")}>
                        <input type="radio" name="pickup-event" checked={eventId === event.id} onChange={() => setEventId(event.id)} className="size-4 accent-[var(--color-psg-blue)]" />
                        <span className="grid w-11 shrink-0 text-center">
                          <span className="font-wide text-[9px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">{format.dateTime(date, { weekday: "short" })}</span>
                          <span className="font-narrow text-[24px] leading-none font-extrabold italic">{format.dateTime(date, { day: "numeric" })}</span>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-semibold">{event.title}</span>
                          <span className="block truncate text-[12px] text-muted-foreground">
                            {tEvents(`types.${event.type}` as never)} · {format.dateTime(date, { month: "short", hour: "2-digit", minute: "2-digit" })}
                            {event.location ? ` · ${event.location}` : ""}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </fieldset>
              ) : null}
              {mode === "shipping" ? (
                <div className="grid grid-cols-[6.5rem_1fr] gap-3">
                  <label className="col-span-2 flex flex-col gap-1.5">
                    <span className={label}>{t("name")}</span>
                    <input autoComplete="name" value={address.name} aria-invalid={errors.name || undefined} onChange={(event) => setAddress({ ...address, name: event.target.value })} className={field} />
                  </label>
                  <label className="col-span-2 flex flex-col gap-1.5">
                    <span className={label}>{t("street")}</span>
                    <AddressAutocomplete
                      className={field}
                      autoComplete="street-address"
                      regions={["ch"]}
                      value={address.street}
                      aria-invalid={errors.street || undefined}
                      onChange={(value) => setAddress((current) => ({ ...current, street: value }))}
                      onPick={(picked) => setAddress((current) => ({ ...current, street: picked.street || picked.formatted, postcode: picked.postcode || current.postcode, city: picked.city || current.city }))}
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className={label}>{t("postcode")}</span>
                    <input autoComplete="postal-code" inputMode="numeric" maxLength={4} value={address.postcode} aria-invalid={errors.postcode || undefined} onChange={(event) => setAddress({ ...address, postcode: event.target.value.replace(/\D/g, "") })} className={field} />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className={label}>{t("city")}</span>
                    <input autoComplete="address-level2" value={address.city} aria-invalid={errors.city || undefined} onChange={(event) => setAddress({ ...address, city: event.target.value })} className={field} />
                  </label>
                  <p className="col-span-2 text-[12px] text-muted-foreground">{t("switzerlandOnly")}</p>
                </div>
              ) : null}
            </div>
          </Step>

          <Step number={3} title={t("paymentTitle")}>
            {/* Computer: the button here; phone: it stays at the bottom of the screen. */}
            <button type="button" disabled={checked === "checking" || !deliveryReady} onClick={pay} className={cn(primary, "max-lg:hidden")}>
              <Lock className="size-3.5" aria-hidden />
              {t("pay", { amount: formatChf(total) })}
            </button>
            <p className="text-[13px] text-muted-foreground">{t("paymentHint")}</p>
          </Step>
        </div>

        {/* Computer: the summary, beside the steps. */}
        <aside className="hidden rounded-[16px] border bg-card p-6 lg:sticky lg:top-6 lg:block">
          <p className={cn(label, "mb-4")}>{t("summary")}</p>
          <Summary items={items} postage={postage} shippingLabel={shippingLabel} />
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
        <button type="button" disabled={checked === "checking" || !deliveryReady} onClick={pay} className={primary}>
          <Lock className="size-3.5" aria-hidden />
          {t("pay", { amount: formatChf(total) })}
        </button>
      </div>
      {/* Room for the bar above, so the page's end is not hidden under it. */}
      <div className="h-20 lg:hidden" aria-hidden />

      <PaySheet
        open={paying}
        onOpenChange={setPaying}
        title={t("payTitle")}
        lines={[
          ...items.map((item) => ({ label: `${item.name}${item.size ? ` · ${item.size}` : ""}${item.quantity > 1 ? ` × ${item.quantity}` : ""}`, amount: item.price * item.quantity })),
          ...(mode === "shipping" ? [{ label: t("postage"), amount: shipping.fee }] : []),
        ]}
        onPaid={() => cart.clear()}
        start={() =>
          startPayment({
            kind: "shop",
            locale,
            items: items.map((item) => ({ variantId: item.variantId, quantity: item.quantity })),
            fulfilment:
              mode === "shipping"
                ? { kind: "shipping", address: { name: address.name.trim(), street: address.street.trim(), postcode: address.postcode.trim(), city: address.city.trim() } }
                : { kind: "pickup", eventId },
          })
        }
      />
    </div>
  );
}
