import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { Suspense } from "react";
import { ProductBadge } from "@/components/shop/product-badges";
import type { Locale } from "@/db/schema";
import { Link } from "@/i18n/navigation";
import { formatChf } from "@/lib/money";
import { shopProducts, type ShopProduct } from "@/lib/payments/shop";
import { cn } from "@/lib/utils";

// Members only: decided at request time (a visitor is sent to sign-in).
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Shop");
  return { title: t("title"), description: t("intro"), robots: { index: false } };
}

const SORTS = ["new", "priceAsc", "priceDesc"] as const;
type Sort = (typeof SORTS)[number];
const sorted = (products: ShopProduct[], sort: Sort) =>
  sort === "priceAsc"
    ? [...products].sort((a, b) => a.price - b.price)
    : sort === "priceDesc"
      ? [...products].sort((a, b) => b.price - a.price)
      : [...products].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

/** One piece of the grid: the photo (the second one shows on hover), badge, name, price, sizes left. */
function ProductCard({ product, index }: { product: ShopProduct; index: number }) {
  const [first, second] = product.images;
  const sized = !(product.sizes.length === 1 && /^(unique|one size|einheitsgrösse|-)$/i.test(product.sizes[0]!.label));
  return (
    <Link href={`/shop/${product.slug}`} className="group flex flex-col gap-3">
      <div className="relative aspect-[4/5] overflow-hidden rounded-[14px] bg-foreground/[0.04]">
        {first ? (
          // eslint-disable-next-line @next/next/no-img-element -- stored media, already sized
          <img
            src={`/api/v1/media/${first}`}
            alt={product.name}
            loading={index < 3 ? "eager" : "lazy"}
            className={cn("absolute inset-0 size-full object-cover transition-[transform,opacity] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.03]", second && "lg:group-hover:opacity-0", product.soldOut && "opacity-60")}
          />
        ) : null}
        {second ? (
          // eslint-disable-next-line @next/next/no-img-element -- stored media, already sized
          <img src={`/api/v1/media/${second}`} alt="" loading="lazy" className="absolute inset-0 hidden size-full object-cover opacity-0 transition-opacity duration-700 lg:block lg:group-hover:opacity-100" />
        ) : null}
        <ProductBadge product={product} className="absolute top-3 left-3" />
      </div>
      <div className="flex flex-col gap-1 px-0.5">
        {/* Stacked on a phone (narrow cards), side by side from sm. */}
        <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
          <h2 className="min-w-0 text-[14px] leading-snug font-semibold text-pretty sm:text-[15px]">{product.name}</h2>
          <span className="shrink-0 text-[14px] text-muted-foreground tabular-nums sm:text-foreground">{formatChf(product.price)}</span>
        </div>
        {sized ? (
          <p className="flex flex-wrap gap-x-2 text-[12px] text-muted-foreground">
            {product.sizes.map((size) => (
              <span key={size.id} className={cn(size.available === 0 && "line-through opacity-50")}>
                {size.label}
              </span>
            ))}
          </p>
        ) : null}
      </div>
    </Link>
  );
}

/** The collection: large photos, the name, the price — and a simple sort. */
async function Collection({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const [t, locale, params] = await Promise.all([getTranslations("Shop"), getLocale(), searchParams]);
  const sort: Sort = SORTS.includes(params.tri as Sort) ? (params.tri as Sort) : "new";
  const products = sorted(await shopProducts(locale as Locale), sort);
  if (products.length === 0) return <p className="py-16 text-center text-[15px] text-muted-foreground">{t("soon")}</p>;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-y py-3">
        <p className="text-[13px] text-muted-foreground">{t("productCount", { count: products.length })}</p>
        <nav aria-label={t("sortLabel")} className="flex gap-1.5">
          {SORTS.map((value) => (
            <Link
              key={value}
              href={value === "new" ? "/shop" : `/shop?tri=${value}`}
              aria-current={sort === value ? "true" : undefined}
              className={cn("inline-flex h-8 items-center rounded-full border px-3 text-[12px] whitespace-nowrap transition-colors", sort === value ? "border-foreground bg-foreground text-background" : "bg-card text-muted-foreground hover:text-foreground")}
            >
              {t(`sort.${value}`)}
            </Link>
          ))}
        </nav>
      </div>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-9 sm:gap-x-5 lg:grid-cols-3 lg:gap-y-12">
        {products.map((product, index) => (
          <li key={product.id}>
            <ProductCard product={product} index={index} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function ShopPage({ searchParams }: PageProps<"/[locale]/shop">) {
  const t = await getTranslations("Shop");
  return (
    <div className="flex flex-col gap-[clamp(28px,4vw,40px)]">
      {/* Same header as News and Support: the title in narrow capitals, one line under it. */}
      <header className="flex flex-col gap-3.5">
        <h1 className="font-narrow text-[length:clamp(44px,9vw,88px)] leading-[0.88] font-extrabold tracking-[-0.01em] uppercase italic">{t("title")}</h1>
        <p className="max-w-[36rem] text-base leading-normal text-pretty text-muted-foreground">{t("intro")}</p>
      </header>
      <Suspense fallback={<div className="grid grid-cols-2 gap-3 lg:grid-cols-3">{[0, 1, 2].map((key) => <div key={key} className="skeleton aspect-[4/5] rounded-[14px]" />)}</div>}>
        <Collection searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
