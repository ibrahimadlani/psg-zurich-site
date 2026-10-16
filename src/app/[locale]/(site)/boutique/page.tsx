import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { Suspense } from "react";
import type { Locale } from "@/db/schema";
import { Link } from "@/i18n/navigation";
import { formatChf } from "@/lib/money";
import { shopProducts } from "@/lib/payments/shop";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Shop");
  return { title: t("title"), description: t("intro") };
}

/** The collection: large photos, the name, the price — nothing else. */
async function Collection() {
  await connection();
  const [t, locale] = await Promise.all([getTranslations("Shop"), getLocale()]);
  const products = await shopProducts(locale as Locale);
  if (products.length === 0) return <p className="py-16 text-center text-[15px] text-muted-foreground">{t("soon")}</p>;
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 lg:grid-cols-3 lg:gap-y-12">
      {products.map((product, index) => (
        <li key={product.id} className={cn(index === 0 && products.length > 2 && "col-span-2 lg:col-span-2 lg:row-span-2")}>
          <Link href={`/boutique/${product.slug}`} className="group flex flex-col gap-3">
            <div className={cn("relative overflow-hidden rounded-[14px] bg-foreground/[0.04]", index === 0 && products.length > 2 ? "aspect-[4/5] lg:aspect-auto lg:h-full lg:min-h-[36rem]" : "aspect-[4/5]")}>
              {product.images[0] ? (
                // eslint-disable-next-line @next/next/no-img-element -- stored media, already sized
                <img
                  src={`/api/v1/media/${product.images[0]}`}
                  alt={product.name}
                  loading={index < 3 ? "eager" : "lazy"}
                  className="absolute inset-0 size-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.03]"
                />
              ) : null}
              {product.soldOut ? (
                <span className="absolute top-3 left-3 rounded-full bg-background/90 px-2.5 py-1 font-wide text-[9px] font-semibold tracking-[0.08em] uppercase backdrop-blur">{t("soldOut")}</span>
              ) : null}
            </div>
            <div className="flex items-baseline justify-between gap-3 px-0.5">
              <h2 className="min-w-0 text-[15px] leading-snug font-semibold text-pretty">{product.name}</h2>
              <span className="shrink-0 text-[14px] text-muted-foreground tabular-nums">{formatChf(product.price)}</span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function ShopPage() {
  const t = await getTranslations("Shop");
  return (
    <div className="flex flex-col gap-[clamp(28px,5vw,56px)]">
      <header className="flex flex-col gap-3">
        <p className="font-wide text-[10px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">{t("eyebrow")}</p>
        <h1 className="font-narrow text-[length:clamp(48px,11vw,112px)] leading-[0.85] font-extrabold uppercase italic">{t("title")}</h1>
        <p className="max-w-[34rem] text-base leading-normal text-pretty text-muted-foreground">{t("intro")}</p>
      </header>
      <Suspense fallback={<div className="grid grid-cols-2 gap-3 lg:grid-cols-3">{[0, 1, 2].map((key) => <div key={key} className="skeleton aspect-[4/5] rounded-[14px]" />)}</div>}>
        <Collection />
      </Suspense>
    </div>
  );
}
