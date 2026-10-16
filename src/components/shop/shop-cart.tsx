"use client";

import { Minus, Plus, ShoppingBag, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { ResponsivePanel } from "@/components/admin/ui/responsive-panel";
import { SignInLink } from "@/components/auth/sign-in-link";
import { PaySheet } from "@/components/payments/pay-sheet";
import { cart, cartCount, cartTotal, useCart } from "@/components/shop/cart-store";
import { Link } from "@/i18n/navigation";
import { formatChf } from "@/lib/money";
import { startPayment } from "@/lib/payments/client";
import { cn } from "@/lib/utils";

export type ShopAccess = "guest" | "pending" | "member";
type Profile = { name: string; street: string; postcode: string; city: string };

const field =
  "h-12 w-full rounded-[10px] border bg-card px-3.5 text-[16px] outline-none [transition:border-color_.2s,box-shadow_.2s] focus:border-primary focus:shadow-[0_0_0_3px_oklch(0.62_0.13_248/0.2)] aria-invalid:border-destructive";
const label = "font-wide text-[10px] font-semibold tracking-[0.06em] text-muted-foreground uppercase";
const primary =
  "inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-segment px-6 font-wide text-[12px] font-semibold tracking-[0.06em] text-segment-foreground uppercase shadow-brand [transition:opacity_.2s,transform_.15s] hover:opacity-90 active:scale-[0.98] disabled:cursor-default disabled:opacity-50";

/** Opens the cart from anywhere in the shop (the product page's "Buy now" too). */
export const openCart = () => window.dispatchEvent(new Event("psgz:open-cart"));

/**
 * The bag of the shop: a button that floats at the bottom of every shop page once something is
 * in it, and the sheet where the order is finished in one step — pick-up at an event (free) or
 * postage in Switzerland, then the payment sheet.
 */
export function ShopCart({ access, profile, shipping }: { access: ShopAccess; profile: Profile | null; shipping: { fee: number; enabled: boolean } }) {
  const t = useTranslations("Shop");
  const locale = useLocale();
  const items = useCart();
  const [open, setOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const [fulfilment, setFulfilment] = useState<"pickup" | "shipping">("pickup");
  const [address, setAddress] = useState<Profile>(profile ?? { name: "", street: "", postcode: "", city: "" });
  const [errors, setErrors] = useState<Partial<Record<keyof Profile, boolean>>>({});

  // "Buy now" on a product page opens the sheet.
  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener("psgz:open-cart", show);
    return () => window.removeEventListener("psgz:open-cart", show);
  }, []);

  const count = cartCount(items);
  const subtotal = cartTotal(items);
  const postage = fulfilment === "shipping" ? shipping.fee : 0;

  function checkout() {
    if (fulfilment === "shipping") {
      const next = { name: !address.name.trim(), street: address.street.trim().length < 3, postcode: !/^\d{4}$/.test(address.postcode.trim()), city: !address.city.trim() };
      setErrors(next);
      if (Object.values(next).some(Boolean)) return;
    }
    setOpen(false);
    setPaying(true);
  }

  return (
    <>
      {count > 0 ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t("openCart", { count })}
          className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 inline-flex h-14 animate-in items-center gap-2.5 rounded-full bg-segment pr-5 pl-4 text-segment-foreground shadow-[0_12px_32px_-8px_rgb(0_0_0/0.45)] fade-in-0 slide-in-from-bottom-4 duration-300 hover:opacity-95 active:scale-[0.97] sm:right-6 sm:bottom-6"
        >
          <ShoppingBag className="size-5" aria-hidden />
          <span className="font-wide text-[11px] font-semibold tracking-[0.06em] uppercase">{t("cart")}</span>
          <span className="grid h-6 min-w-6 place-items-center rounded-full bg-psg-red px-1.5 text-[12px] font-bold text-white tabular-nums">{count}</span>
        </button>
      ) : null}

      <ResponsivePanel open={open} onOpenChange={setOpen} title={t("cart")}>
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <ShoppingBag className="size-6 text-muted-foreground" aria-hidden />
            <p className="text-[15px] text-muted-foreground">{t("emptyCart")}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <ul className="flex flex-col divide-y">
              {items.map((item) => (
                <li key={item.variantId} className="flex gap-3 py-3 first:pt-0">
                  <Link href={`/boutique/${item.slug}`} onClick={() => setOpen(false)} className="size-20 shrink-0 overflow-hidden rounded-[10px] bg-foreground/5">
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element -- stored media
                      <img src={`/api/v1/media/${item.image}`} alt="" className="size-full object-cover" />
                    ) : null}
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 text-[15px] leading-snug font-semibold">{item.name}</p>
                      <button type="button" aria-label={t("remove")} onClick={() => cart.setQuantity(item.variantId, 0)} className="-mt-1 -mr-1 grid size-8 shrink-0 cursor-pointer place-items-center rounded-full text-muted-foreground hover:bg-foreground/5 hover:text-foreground">
                        <X className="size-4" aria-hidden />
                      </button>
                    </div>
                    {item.size ? <p className="text-[13px] text-muted-foreground">{t("size", { size: item.size })}</p> : null}
                    <div className="mt-auto flex items-center justify-between gap-2">
                      <div className="inline-flex items-center rounded-full border">
                        <button type="button" aria-label={t("less")} onClick={() => cart.setQuantity(item.variantId, item.quantity - 1)} className="grid size-9 cursor-pointer place-items-center">
                          <Minus className="size-3.5" aria-hidden />
                        </button>
                        <span className="w-6 text-center text-[14px] tabular-nums" aria-live="polite">
                          {item.quantity}
                        </span>
                        <button type="button" aria-label={t("more")} onClick={() => cart.setQuantity(item.variantId, item.quantity + 1)} className="grid size-9 cursor-pointer place-items-center">
                          <Plus className="size-3.5" aria-hidden />
                        </button>
                      </div>
                      <span className="text-[15px] tabular-nums">{formatChf(item.price * item.quantity)}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {access === "member" ? (
              <>
                <fieldset className="flex flex-col gap-2">
                  <legend className={cn(label, "mb-2")}>{t("delivery")}</legend>
                  {(["pickup", ...(shipping.enabled ? ["shipping" as const] : [])] as const).map((kind) => (
                    <label
                      key={kind}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-[12px] border p-3.5 transition-colors",
                        fulfilment === kind ? "border-foreground/40 bg-foreground/[0.03]" : "hover:border-foreground/20",
                      )}
                    >
                      <input type="radio" name="fulfilment" checked={fulfilment === kind} onChange={() => setFulfilment(kind)} className="mt-1 accent-[var(--color-psg-blue)]" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2 text-[14px] font-semibold">
                          {t(`${kind}Title`)}
                          <span className="font-normal tabular-nums">{kind === "pickup" ? t("free") : formatChf(shipping.fee)}</span>
                        </span>
                        <span className="block text-[13px] text-muted-foreground">{t(`${kind}Body`)}</span>
                      </span>
                    </label>
                  ))}
                </fieldset>
                {fulfilment === "shipping" ? (
                  <div className="grid grid-cols-[6rem_1fr] gap-3">
                    <label className="col-span-2 flex flex-col gap-1.5">
                      <span className={label}>{t("name")}</span>
                      <input autoComplete="name" value={address.name} aria-invalid={errors.name || undefined} onChange={(event) => setAddress({ ...address, name: event.target.value })} className={field} />
                    </label>
                    <label className="col-span-2 flex flex-col gap-1.5">
                      <span className={label}>{t("street")}</span>
                      <input autoComplete="street-address" value={address.street} aria-invalid={errors.street || undefined} onChange={(event) => setAddress({ ...address, street: event.target.value })} className={field} />
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
                <div className="flex flex-col gap-3 border-t pt-4">
                  <div className="flex items-baseline justify-between">
                    <span className={label}>{t("total")}</span>
                    <span className="font-narrow text-[30px] leading-none font-extrabold tabular-nums italic">{formatChf(subtotal + postage)}</span>
                  </div>
                  <button type="button" onClick={checkout} className={primary}>
                    {t("checkout", { amount: formatChf(subtotal + postage) })}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-3 rounded-[12px] border bg-foreground/[0.02] p-4 text-center">
                <p className="text-[14px] font-semibold">{access === "pending" ? t("pendingTitle") : t("membersOnly")}</p>
                <p className="text-[13px] text-muted-foreground">{access === "pending" ? t("pendingBody") : t("membersOnlyBody")}</p>
                {access === "guest" ? (
                  <div className="flex flex-col gap-2">
                    <Link href="/adhesion?suite=%2Fboutique" className={primary}>
                      {t("join")}
                    </Link>
                    <SignInLink className="text-[13px] underline underline-offset-4">{t("signIn")}</SignInLink>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )}
      </ResponsivePanel>

      <PaySheet
        open={paying}
        onOpenChange={setPaying}
        title={t("order")}
        lines={[
          ...items.map((item) => ({ label: `${item.name}${item.size ? ` · ${item.size}` : ""}${item.quantity > 1 ? ` × ${item.quantity}` : ""}`, amount: item.price * item.quantity })),
          ...(fulfilment === "shipping" ? [{ label: t("shippingTitle"), amount: shipping.fee }] : []),
        ]}
        onPaid={() => cart.clear()}
        start={() =>
          startPayment({
            kind: "shop",
            locale,
            items: items.map((item) => ({ variantId: item.variantId, quantity: item.quantity })),
            fulfilment: fulfilment === "shipping" ? { kind: "shipping", address: { name: address.name.trim(), street: address.street.trim(), postcode: address.postcode.trim(), city: address.city.trim() } } : { kind: "pickup" },
          })
        }
      />
    </>
  );
}
