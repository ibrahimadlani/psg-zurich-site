import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ProductBadge } from "@/components/shop/product-badges";
import { ProductBuy } from "@/components/shop/product-buy";
import { ProductGallery } from "@/components/shop/product-gallery";
import { ProductSections } from "@/components/shop/product-sections";
import type { Locale } from "@/db/schema";
import { Link } from "@/i18n/navigation";
import { formatChf } from "@/lib/money";
import { getShopSettings, shopProduct } from "@/lib/payments/shop";
import { ProductSkeleton } from "@/components/skeletons";
import { Streamed } from "@/components/ui/streamed";

export const instant = false;

export async function generateMetadata({ params }: PageProps<"/[locale]/shop/[slug]">): Promise<Metadata> {
  const [{ slug }, locale] = await Promise.all([params, getLocale()]);
  const product = await shopProduct(slug, locale as Locale);
  // Members-only pages: kept out of search engines.
  return product ? { title: product.name, description: product.description.slice(0, 160), robots: { index: false } } : { robots: { index: false } };
}

/** One piece: photos, name and price, sizes and the way to buy, then the details folded away. */
async function Product({ slug }: { slug: string }) {
  await connection();
  const [t, locale, settings] = await Promise.all([getTranslations("Shop"), getLocale(), getShopSettings()]);
  const product = await shopProduct(slug, locale as Locale);
  if (!product) notFound();
  return (
    <div className="grid items-start gap-[clamp(24px,4vw,56px)] lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <ProductGallery images={product.images} name={product.name} />
      <div className="flex flex-col gap-6 lg:sticky lg:top-8">
        <nav aria-label={t("breadcrumb")} className="flex items-center gap-1 text-[13px] text-muted-foreground">
          <Link href="/shop" className="hover:text-foreground">
            {t("title")}
          </Link>
          <ChevronRight className="size-3.5" aria-hidden />
          <span className="truncate text-foreground">{product.name}</span>
        </nav>
        <div className="flex flex-col gap-3">
          <ProductBadge product={product} className="self-start" />
          <h1 className="font-narrow text-[length:clamp(36px,6vw,56px)] leading-[0.9] font-extrabold text-balance uppercase italic">{product.name}</h1>
          <p className="text-[22px] tabular-nums">{formatChf(product.price)}</p>
        </div>
        {product.soldOut ? (
          <p className="rounded-[12px] border px-4 py-3 text-[14px] text-muted-foreground">{t("soldOutLong")}</p>
        ) : (
          <ProductBuy product={{ slug: product.slug, name: product.name, price: product.price, image: product.images[0] ?? null, sizes: product.sizes, sizeGuide: product.sizeGuide }} />
        )}
        <ProductSections
          sections={[
            { title: t("details.description"), text: product.description },
            ...(product.details.length ? [{ title: t("details.details"), bullets: product.details }] : []),
            {
              title: t("details.shipping"),
              bullets: [
                t("details.pickupBullet"),
                ...(settings.shippingEnabled ? [t("details.postBullet", { fee: formatChf(settings.shippingFee) })] : []),
                t("details.exchangeBullet"),
              ],
            },
          ]}
        />
      </div>
    </div>
  );
}

export default async function ProductPage({ params }: PageProps<"/[locale]/shop/[slug]">) {
  const { slug } = await params;
  return (
    <Streamed fallback={<ProductSkeleton />}>
      <Product slug={slug} />
    </Streamed>
  );
}
