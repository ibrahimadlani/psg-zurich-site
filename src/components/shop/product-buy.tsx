"use client";

import { Minus, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { cart, openCart } from "@/components/shop/cart-store";
import { SizeGuide } from "@/components/shop/size-guide";
import { useRouter } from "@/i18n/navigation";
import { formatChf } from "@/lib/money";
import { cn } from "@/lib/utils";

type Size = { id: string; label: string; available: number };

const primary =
  "inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-segment px-6 font-wide text-[12px] font-semibold tracking-[0.06em] text-segment-foreground uppercase shadow-brand [transition:opacity_.2s,transform_.15s] hover:opacity-90 active:scale-[0.98] disabled:cursor-default disabled:opacity-40";
const secondary =
  "inline-flex h-12 min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 rounded-[10px] border bg-card px-4 font-wide text-[12px] font-semibold tracking-[0.06em] uppercase transition-[background-color,transform] hover:bg-foreground/5 active:scale-[0.98] disabled:cursor-default disabled:opacity-40";

const stepper =
  "grid size-10 cursor-pointer place-items-center rounded-[7px] text-muted-foreground transition-[background-color,color,transform] hover:bg-foreground/5 hover:text-foreground active:scale-[0.92] disabled:cursor-default disabled:opacity-35 disabled:hover:bg-transparent";

const single = (label: string) => /^(unique|one size|einheitsgrösse|-)$/i.test(label);

/**
 * Sizes (sold-out ones struck through), what is left, quantity, then "Add to bag" (opens the bag
 * on the new line) or "Buy now" (straight to checkout). On a phone, a bar with the price and
 * "Add" stays at the bottom once these buttons are scrolled away.
 */
export function ProductBuy({
  product,
}: {
  product: { slug: string; name: string; price: number; image: string | null; sizes: Size[]; sizeGuide: { columns: string[]; rows: string[][] } | null };
}) {
  const t = useTranslations("Shop");
  const router = useRouter();
  const onlyOne = product.sizes.length === 1 && single(product.sizes[0]!.label);
  const [size, setSize] = useState<string | null>(onlyOne ? product.sizes[0]!.id : null);
  const [quantity, setQuantity] = useState(1);
  const [missingSize, setMissingSize] = useState(false);
  const [barVisible, setBarVisible] = useState(false);
  const buttons = useRef<HTMLDivElement>(null);
  const chosen = product.sizes.find((item) => item.id === size);
  const max = Math.min(10, chosen?.available ?? 10);

  // The phone bar appears once the main buttons have scrolled out of view.
  useEffect(() => {
    const element = buttons.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setBarVisible(!entry!.isIntersecting && entry!.boundingClientRect.top < 0), { threshold: 0 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  function add(then: "bag" | "checkout") {
    if (!chosen) {
      setMissingSize(true);
      buttons.current?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }
    cart.add({ variantId: chosen.id, slug: product.slug, name: product.name, size: onlyOne ? "" : chosen.label, price: product.price, image: product.image, max: chosen.available }, quantity);
    if (then === "checkout") router.push("/checkout");
    else openCart(chosen.id);
  }

  const stock = chosen ? (chosen.available <= 3 ? t("fewLeft", { count: chosen.available }) : t("inStock")) : null;

  return (
    <div className="flex flex-col gap-5">
      {onlyOne ? null : (
        <fieldset className="flex flex-col gap-2.5">
          <div className="mb-2.5 flex items-baseline justify-between gap-3">
            <legend className={cn("font-wide text-[10px] font-semibold tracking-[0.06em] uppercase", missingSize ? "text-psg-red" : "text-muted-foreground")}>
              {missingSize ? t("pickSizeFirst") : t("chooseSize")}
            </legend>
            {product.sizeGuide ? <SizeGuide guide={product.sizeGuide} name={product.name} /> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {product.sizes.map((item) => {
              const out = item.available === 0;
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={out}
                  aria-pressed={size === item.id}
                  onClick={() => {
                    setSize(item.id);
                    setQuantity(1);
                    setMissingSize(false);
                  }}
                  className={cn(
                    "h-12 min-w-14 cursor-pointer rounded-[10px] border px-4 text-[15px] font-semibold transition-[border-color,background-color,color,transform] active:scale-[0.97]",
                    size === item.id ? "border-segment bg-segment text-segment-foreground" : "bg-card hover:border-foreground/40",
                    missingSize && "border-psg-red/50",
                    out && "cursor-default text-muted-foreground line-through opacity-50",
                  )}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {stock ? (
        <p className={cn("-mt-1 flex items-center gap-1.5 text-[13px]", chosen && chosen.available <= 3 ? "text-psg-red" : "text-muted-foreground")}>
          <span aria-hidden className={cn("size-1.5 rounded-full", chosen && chosen.available <= 3 ? "bg-psg-red" : "bg-ok")} />
          {stock}
        </p>
      ) : null}

      {/* Quantity next to "Add to bag", same height and corners; "Buy now" on its own line below. */}
      <div ref={buttons} className="flex flex-col gap-2">
        <div className="flex gap-2">
          <div role="group" aria-label={t("quantity")} className="inline-flex h-12 shrink-0 items-center rounded-[10px] border bg-card p-1">
            <button type="button" aria-label={t("less")} disabled={quantity <= 1} onClick={() => setQuantity((value) => Math.max(1, value - 1))} className={stepper}>
              <Minus className="size-3.5" aria-hidden />
            </button>
            <span className="w-8 text-center text-[15px] font-semibold tabular-nums" aria-live="polite">
              {quantity}
            </span>
            <button type="button" aria-label={t("more")} disabled={quantity >= max} onClick={() => setQuantity((value) => Math.min(max, value + 1))} className={stepper}>
              <Plus className="size-3.5" aria-hidden />
            </button>
          </div>
          <button type="button" onClick={() => add("bag")} className={secondary}>
            {t("addToBag")}
          </button>
        </div>
        <button type="button" onClick={() => add("checkout")} className={cn(primary, "w-full")}>
          {t("buyNow")}
        </button>
      </div>

      {/* Phone: the buttons follow the scroll. */}
      <div
        data-visible={barVisible || undefined}
        className="fixed inset-x-0 bottom-0 z-40 translate-y-full border-t bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur transition-transform duration-300 ease-out data-[visible]:translate-y-0 lg:hidden motion-reduce:transition-none"
        aria-hidden={!barVisible}
        inert={!barVisible}
      >
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold">{product.name}</p>
            <p className="text-[13px] text-muted-foreground tabular-nums">
              {formatChf(product.price)}
              {chosen && !onlyOne ? ` · ${chosen.label}` : ""}
            </p>
          </div>
          <button type="button" onClick={() => add("bag")} className={cn(primary, "h-11 flex-none px-5")}>
            {chosen || onlyOne ? t("add") : t("chooseSize")}
          </button>
        </div>
      </div>
    </div>
  );
}
