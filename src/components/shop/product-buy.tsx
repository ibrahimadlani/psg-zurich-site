"use client";

import { Check, Minus, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { cart } from "@/components/shop/cart-store";
import { openCart, type ShopAccess } from "@/components/shop/shop-cart";
import { cn } from "@/lib/utils";

type Size = { id: string; label: string; available: number };

const primary =
  "inline-flex h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-segment px-6 font-wide text-[12px] font-semibold tracking-[0.06em] text-segment-foreground uppercase shadow-brand [transition:opacity_.2s,transform_.15s] hover:opacity-90 active:scale-[0.98] disabled:cursor-default disabled:opacity-40";
const secondary =
  "inline-flex h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-[10px] border bg-card px-6 font-wide text-[12px] font-semibold tracking-[0.06em] uppercase transition-[background-color,transform] hover:bg-foreground/5 active:scale-[0.98] disabled:cursor-default disabled:opacity-40";

const single = (label: string) => /^(unique|one size|einheitsgrösse|-)$/i.test(label);

/** Size pills (sold-out ones struck through), quantity, then "Add to bag" or "Buy now". */
export function ProductBuy({
  product,
  access,
}: {
  product: { slug: string; name: string; price: number; image: string | null; sizes: Size[] };
  access: ShopAccess;
}) {
  const t = useTranslations("Shop");
  const onlyOne = product.sizes.length === 1 && single(product.sizes[0]!.label);
  const [size, setSize] = useState<string | null>(onlyOne ? product.sizes[0]!.id : null);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const chosen = product.sizes.find((item) => item.id === size);
  const max = Math.min(10, chosen?.available ?? 10);

  function add(andOpen: boolean) {
    if (!chosen) return;
    cart.add({ variantId: chosen.id, slug: product.slug, name: product.name, size: onlyOne ? "" : chosen.label, price: product.price, image: product.image }, quantity);
    if (andOpen) openCart();
    else {
      setAdded(true);
      toast.success(t("added"), { action: { label: t("cart"), onClick: openCart } });
      window.setTimeout(() => setAdded(false), 1600);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {onlyOne ? null : (
        <fieldset className="flex flex-col gap-2.5">
          <legend className="mb-2.5 font-wide text-[10px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">{t("chooseSize")}</legend>
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
                  }}
                  className={cn(
                    "h-12 min-w-14 cursor-pointer rounded-[10px] border px-4 text-[15px] font-semibold transition-[border-color,background-color,color]",
                    size === item.id ? "border-segment bg-segment text-segment-foreground" : "bg-card hover:border-foreground/40",
                    out && "cursor-default text-muted-foreground line-through opacity-50",
                  )}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
          {chosen && chosen.available <= 3 ? <p className="text-[13px] text-psg-red">{t("fewLeft", { count: chosen.available })}</p> : null}
        </fieldset>
      )}

      <div className="flex items-center gap-3">
        <div className="inline-flex items-center rounded-full border">
          <button type="button" aria-label={t("less")} disabled={quantity <= 1} onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="grid size-11 cursor-pointer place-items-center disabled:opacity-40">
            <Minus className="size-4" aria-hidden />
          </button>
          <span className="w-7 text-center text-[16px] tabular-nums" aria-live="polite">
            {quantity}
          </span>
          <button type="button" aria-label={t("more")} disabled={quantity >= max} onClick={() => setQuantity((value) => Math.min(max, value + 1))} className="grid size-11 cursor-pointer place-items-center disabled:opacity-40">
            <Plus className="size-4" aria-hidden />
          </button>
        </div>
        {access !== "member" ? <p className="text-[13px] text-muted-foreground">{t("membersOnly")}</p> : null}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="button" disabled={!chosen} onClick={() => add(false)} className={secondary}>
          {added ? <Check className="size-4" aria-hidden /> : null}
          {chosen ? t("addToBag") : t("pickSizeFirst")}
        </button>
        <button type="button" disabled={!chosen} onClick={() => add(true)} className={primary}>
          {t("buyNow")}
        </button>
      </div>
    </div>
  );
}
