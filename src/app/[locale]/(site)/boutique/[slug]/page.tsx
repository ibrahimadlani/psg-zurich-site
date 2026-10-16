import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { ProductBuy } from "@/components/shop/product-buy";
import type { Locale } from "@/db/schema";
import { Link } from "@/i18n/navigation";
import { formatChf } from "@/lib/money";
import { shopProduct } from "@/lib/payments/shop";
import { shopVisitor } from "@/lib/payments/shop-access";

export const instant = false;

export async function generateMetadata({ params }: PageProps<"/[locale]/boutique/[slug]">): Promise<Metadata> {
  const [{ slug }, locale] = await Promise.all([params, getLocale()]);
  const product = await shopProduct(slug, locale as Locale);
  return product ? { title: product.name, description: product.description.slice(0, 160) } : {};
}

/** One piece: its photos (swiped on a phone), name, price, words, sizes. */
async function Product({ slug }: { slug: string }) {
  await connection();
  const [t, locale, visitor] = await Promise.all([getTranslations("Shop"), getLocale(), shopVisitor()]);
  const product = await shopProduct(slug, locale as Locale);
  if (!product) notFound();
  const images = product.images.length ? product.images : [null];
  return (
    <div className="grid items-start gap-[clamp(24px,4vw,56px)] lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
      {/* Photos: side by side and swiped on a phone, stacked on a computer. */}
      <div className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:flex-col lg:gap-3 lg:overflow-visible lg:px-0">
        {images.map((image, index) => (
          <div key={image ?? index} className="relative aspect-[4/5] w-[86%] shrink-0 snap-center overflow-hidden rounded-[16px] bg-foreground/[0.04] lg:w-full">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element -- stored media, already sized
              <img src={`/api/v1/media/${image}`} alt={index === 0 ? product.name : ""} loading={index === 0 ? "eager" : "lazy"} className="absolute inset-0 size-full object-cover" />
            ) : null}
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-6 lg:sticky lg:top-8">
        <Link href="/boutique" className="inline-flex items-center gap-1.5 self-start text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden />
          {t("title")}
        </Link>
        <div className="flex flex-col gap-3">
          <h1 className="font-narrow text-[length:clamp(36px,6vw,56px)] leading-[0.9] font-extrabold text-balance uppercase italic">{product.name}</h1>
          <p className="text-[20px] tabular-nums">{formatChf(product.price)}</p>
        </div>
        {product.soldOut ? (
          <p className="rounded-[12px] border px-4 py-3 text-[14px] text-muted-foreground">{t("soldOutLong")}</p>
        ) : (
          <ProductBuy product={{ slug: product.slug, name: product.name, price: product.price, image: product.images[0] ?? null, sizes: product.sizes }} access={visitor.access} />
        )}
        <div className="border-t pt-6 text-[15px] leading-relaxed whitespace-pre-line text-pretty text-muted-foreground">{product.description}</div>
        <ul className="flex flex-col gap-1.5 text-[13px] text-muted-foreground">
          <li>{t("perkPickup")}</li>
          <li>{t("perkShipping")}</li>
          <li>{t("perkReceipt")}</li>
        </ul>
      </div>
    </div>
  );
}

export default async function ProductPage({ params }: PageProps<"/[locale]/boutique/[slug]">) {
  const { slug } = await params;
  return (
    <Suspense fallback={<div className="skeleton aspect-[4/5] rounded-[16px] lg:w-1/2" />}>
      <Product slug={slug} />
    </Suspense>
  );
}
