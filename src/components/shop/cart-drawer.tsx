"use client";

import { ArrowRight, Minus, Plus, ShoppingBag, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useIsDesktop } from "@/components/admin/ui/responsive-panel";
import { headerIconButtonClass } from "@/components/header-icon-button";
import { RollingNumber } from "@/components/shop/rolling-number";
import { cart, cartCount, cartTotal, OPEN_CART_EVENT, useCart, type CartItem } from "@/components/shop/cart-store";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Link, usePathname } from "@/i18n/navigation";
import { useShopOpen } from "@/components/shop/use-shop-open";
import { useSession } from "@/lib/auth-client";
import { formatChf } from "@/lib/money";
import { cn } from "@/lib/utils";

const LEAVE_MS = 260;

/** One line of the bag: photo, name, size, quantity, price; folds away when removed. */
function Line({ item, highlighted, onNavigate }: { item: CartItem; highlighted: boolean; onNavigate: () => void }) {
  const t = useTranslations("Shop");
  const [leaving, setLeaving] = useState(false);

  const remove = () => {
    setLeaving(true);
    window.setTimeout(() => cart.setQuantity(item.variantId, 0), LEAVE_MS);
  };

  return (
    <li
      data-leaving={leaving || undefined}
      className="grid grid-rows-[1fr] opacity-100 transition-[grid-template-rows,opacity] duration-[260ms] ease-out data-[leaving]:grid-rows-[0fr] data-[leaving]:opacity-0 motion-reduce:transition-none"
    >
      <div className="min-h-0 overflow-hidden">
        <div
          className={cn(
            "flex animate-in gap-3.5 rounded-[12px] px-2 py-3 fade-in-0 slide-in-from-right-4 duration-300 motion-reduce:animate-none",
            highlighted && "bg-psg-blue/[0.06] dark:bg-white/[0.06]",
            "transition-colors duration-700",
          )}
        >
          <Link href={`/shop/${item.slug}`} onClick={onNavigate} className="size-16 shrink-0 overflow-hidden rounded-[10px] bg-foreground/[0.05]">
            {item.image ? (
              // eslint-disable-next-line @next/next/no-img-element -- stored media
              <img src={`/api/v1/media/${item.image}`} alt="" className="size-full object-cover" />
            ) : null}
          </Link>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-start justify-between gap-2">
              <Link href={`/shop/${item.slug}`} onClick={onNavigate} className="min-w-0 text-[14px] leading-snug font-semibold hover:underline">
                {item.name}
              </Link>
              <button type="button" aria-label={t("remove")} onClick={remove} className="-mt-1.5 -mr-1.5 grid size-8 shrink-0 cursor-pointer place-items-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground">
                <X className="size-3.5" aria-hidden />
              </button>
            </div>
            <p className="text-[12px] text-muted-foreground">
              {item.size ? `${t("size", { size: item.size })} · ` : ""}
              {formatChf(item.price)}
            </p>
            <div className="mt-auto flex items-center justify-between gap-2 pt-1">
              <div className="inline-flex h-8 items-center rounded-full border">
                <button type="button" aria-label={t("less")} onClick={() => (item.quantity <= 1 ? remove() : cart.setQuantity(item.variantId, item.quantity - 1))} className="grid size-8 cursor-pointer place-items-center">
                  <Minus className="size-3" aria-hidden />
                </button>
                <RollingNumber value={item.quantity} className="w-5 justify-center text-[13px] font-semibold tabular-nums">
                  {item.quantity}
                </RollingNumber>
                <button type="button" aria-label={t("more")} disabled={item.quantity >= Math.min(10, item.max ?? 10)} onClick={() => cart.setQuantity(item.variantId, item.quantity + 1)} className="grid size-8 cursor-pointer place-items-center disabled:opacity-40">
                  <Plus className="size-3" aria-hidden />
                </button>
              </div>
              <RollingNumber value={item.price * item.quantity} className="text-[14px] font-semibold tabular-nums">
                {formatChf(item.price * item.quantity)}
              </RollingNumber>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

/**
 * The bag, and only the bag: a panel from the right on a computer, a sheet from the bottom on a
 * phone. Lines slide in, fold away when removed, figures roll; the order is finished on /checkout.
 */
export function CartDrawer() {
  const t = useTranslations("Shop");
  const items = useCart();
  const desktop = useIsDesktop();
  const pathname = usePathname();
  const session = useSession();
  const shopOpen = useShopOpen();
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState<string | null>(null);

  // "Add to bag" anywhere opens it on the new line.
  useEffect(() => {
    const show = (event: Event) => {
      setHighlight((event as CustomEvent<string | null>).detail);
      setOpen(true);
    };
    window.addEventListener(OPEN_CART_EVENT, show);
    return () => window.removeEventListener(OPEN_CART_EVENT, show);
  }, []);
  // The highlight fades after a moment.
  useEffect(() => {
    if (!highlight) return;
    const timer = window.setTimeout(() => setHighlight(null), 1600);
    return () => window.clearTimeout(timer);
  }, [highlight]);

  const count = cartCount(items);
  const subtotal = cartTotal(items);
  // Members only (the shop is theirs), and only once something is in the bag; but kept while
  // the bag is open (emptying it shows its empty state). At checkout the bag is the page's summary.
  if (!session.data || !shopOpen || pathname.startsWith("/checkout") || (count === 0 && !open)) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("openCart", { count })}
        className={cn(headerIconButtonClass, "relative")}
      >
        <ShoppingBag className="size-3.5" aria-hidden />
        {count ? (
          <span
            key={count}
            aria-hidden
            className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 animate-in place-items-center rounded-full bg-psg-red px-1 text-[9px] leading-none font-bold text-white tabular-nums ring-2 ring-background zoom-in-50 duration-300"
          >
            {count > 9 ? "9+" : count}
          </span>
        ) : null}
      </button>
      <SheetContent
        side={desktop ? "right" : "bottom"}
        showCloseButton={false}
        className={cn("gap-0 bg-background p-0", desktop ? "w-full data-[side=right]:sm:max-w-[26rem]" : "max-h-[88svh] rounded-t-[20px]")}
      >
        {desktop ? null : <span aria-hidden className="mx-auto mt-3 block h-1 w-10 shrink-0 rounded-full bg-foreground/15" />}
        <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3 lg:pt-6">
          <SheetTitle className="flex items-baseline gap-2 font-narrow text-[28px] leading-none font-extrabold uppercase italic">
            {t("cart")}
            {count ? (
              <span className="font-sans text-[13px] font-normal tracking-normal text-muted-foreground normal-case not-italic">
                {t("itemCount", { count })}
              </span>
            ) : null}
          </SheetTitle>
          <SheetDescription className="sr-only">{t("cart")}</SheetDescription>
          <SheetClose className="-mr-2 grid size-10 cursor-pointer place-items-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground">
            <X className="size-5" aria-hidden />
            <span className="sr-only">{t("close")}</span>
          </SheetClose>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 animate-in flex-col items-center justify-center gap-4 px-6 py-14 text-center fade-in-0 duration-300">
            <span className="grid size-14 place-items-center rounded-full bg-foreground/[0.05]">
              <ShoppingBag className="size-6 text-muted-foreground" aria-hidden />
            </span>
            <p className="text-[15px] text-muted-foreground">{t("emptyCart")}</p>
            <SheetClose asChild>
              <Link href="/shop" className="inline-flex items-center gap-1.5 border-b border-psg-red pb-0.5 text-[14px] font-semibold">
                {t("seeCollection")}
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </SheetClose>
          </div>
        ) : (
          <>
            <ul className="min-h-0 flex-1 overflow-y-auto border-t px-3 py-2">
              {items.map((item) => (
                <Line key={item.variantId} item={item} highlighted={highlight === item.variantId} onNavigate={() => setOpen(false)} />
              ))}
            </ul>
            <div className="flex flex-col gap-3 border-t bg-background px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <div className="flex items-baseline justify-between">
                <span className="text-[14px]">{t("subtotal")}</span>
                <RollingNumber value={subtotal} className="text-[17px] font-semibold tabular-nums">
                  {formatChf(subtotal)}
                </RollingNumber>
              </div>
              <p className="text-[12px] text-muted-foreground">{t("deliveryNext")}</p>
              <SheetClose asChild>
                <Link
                  href="/checkout"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-[10px] bg-segment px-6 font-wide text-[12px] font-semibold tracking-[0.06em] text-segment-foreground uppercase shadow-brand [transition:opacity_.2s,transform_.15s] hover:opacity-90 active:scale-[0.98]"
                >
                  {t("checkout", { amount: formatChf(subtotal) })}
                  <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              </SheetClose>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
