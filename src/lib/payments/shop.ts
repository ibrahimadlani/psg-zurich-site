import "server-only";
import { and, asc, eq, inArray, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { orders, paymentItems, payments, productVariants, products, shopSettings, stockHolds, type Locale } from "@/db/schema";
import { HttpError } from "@/lib/permissions";

/*
 * The club shop: products with sizes, a stock per size. Pieces are set aside (held) while a
 * checkout is paid, taken from the stock once it is, and given back if the checkout is
 * abandoned or the order refunded before it was handed over.
 */

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** How long pieces stay set aside for a checkout in progress. */
const HOLD_MINUTES = 30;

export type ShopProduct = Awaited<ReturnType<typeof shopProducts>>[number];

/** Active products with their sizes and what is left of each (stock minus pieces held). */
export async function shopProducts(locale: Locale, { all = false }: { all?: boolean } = {}) {
  const rows = await db
    .select()
    .from(products)
    .where(all ? undefined : eq(products.active, true))
    .orderBy(asc(products.sortOrder), asc(products.createdAt));
  if (rows.length === 0) return [];
  const variants = await db
    .select()
    .from(productVariants)
    .where(inArray(productVariants.productId, rows.map((row) => row.id)))
    .orderBy(asc(productVariants.sortOrder));
  return rows.map((product) => {
    const sizes = variants
      .filter((variant) => variant.productId === product.id)
      .map((variant) => ({ id: variant.id, label: variant.label, sku: variant.sku, stock: variant.stock, held: variant.held, available: Math.max(0, variant.stock - variant.held) }));
    return {
      id: product.id,
      slug: product.slug,
      name: product.name[locale] || product.name.fr,
      description: product.description[locale] || product.description.fr,
      names: product.name,
      descriptions: product.description,
      price: product.price,
      images: product.images,
      active: product.active,
      sortOrder: product.sortOrder,
      sizes,
      soldOut: sizes.every((size) => size.available === 0),
    };
  });
}

export async function shopProduct(slug: string, locale: Locale) {
  return (await shopProducts(locale)).find((product) => product.slug === slug) ?? null;
}

export async function getShopSettings() {
  const [row] = await db.select().from(shopSettings).where(eq(shopSettings.id, 1));
  return row ?? { id: 1, shippingFee: 900, shippingEnabled: true, updatedAt: new Date() };
}

export type CartLine = { variantId: string; quantity: number };
export type Fulfilment = { kind: "pickup" } | { kind: "shipping"; address: { name: string; street: string; postcode: string; city: string } };

/** The lines of a cart, priced from the database ("Écharpe · M"; "Unique" sizes are not named). */
export async function priceCart(cart: CartLine[], fulfilment: Fulfilment, locale: Locale) {
  const merged = new Map<string, number>();
  for (const line of cart) merged.set(line.variantId, (merged.get(line.variantId) ?? 0) + line.quantity);
  if (merged.size === 0) throw new HttpError(400, "empty_cart", "The cart is empty.");
  const rows = await db
    .select({ variant: productVariants, product: products })
    .from(productVariants)
    .innerJoin(products, eq(products.id, productVariants.productId))
    .where(inArray(productVariants.id, [...merged.keys()]));
  if (rows.length !== merged.size || rows.some((row) => !row.product.active)) throw new HttpError(409, "product_unavailable", "A product is no longer available.");
  const lines: { type: "product" | "shipping"; description: string; quantity: number; unitAmount: number; variantId?: string }[] = rows.map(({ variant, product }) => {
    const name = product.name[locale] || product.name.fr;
    const single = /^(unique|one size|einheitsgrösse|-)$/i.test(variant.label);
    return {
      type: "product" as const,
      description: single ? name : `${name} · ${variant.label}`,
      quantity: merged.get(variant.id)!,
      unitAmount: product.price,
      variantId: variant.id,
    };
  });
  if (fulfilment.kind === "shipping") {
    const settings = await getShopSettings();
    if (!settings.shippingEnabled) throw new HttpError(409, "shipping_unavailable", "Shipping is not offered.");
    lines.push({ type: "shipping", description: { fr: "Envoi postal (Suisse)", en: "Shipping (Switzerland)", de: "Postversand (Schweiz)" }[locale], quantity: 1, unitAmount: settings.shippingFee });
  }
  return lines;
}

/**
 * Inside the checkout's transaction: the pieces are set aside (or the checkout refused when
 * one is gone), and the order is written, waiting for the payment.
 */
export async function holdCart(tx: Tx, paymentId: string, memberId: string, lines: { variantId?: string; quantity: number }[], fulfilment: Fulfilment) {
  const wanted = lines.filter((line): line is { variantId: string; quantity: number } => Boolean(line.variantId));
  const variants = await tx.select().from(productVariants).where(inArray(productVariants.id, wanted.map((line) => line.variantId))).for("update");
  for (const line of wanted) {
    const variant = variants.find((row) => row.id === line.variantId);
    if (!variant || variant.stock - variant.held < line.quantity) throw new HttpError(409, "out_of_stock", "Not enough left in stock.");
  }
  const expiresAt = new Date(Date.now() + HOLD_MINUTES * 60_000);
  for (const line of wanted) {
    await tx.update(productVariants).set({ held: sql`${productVariants.held} + ${line.quantity}` }).where(eq(productVariants.id, line.variantId));
  }
  await tx.insert(stockHolds).values(wanted.map((line) => ({ variantId: line.variantId, paymentId, quantity: line.quantity, expiresAt })));
  await tx.insert(orders).values({
    paymentId,
    memberId,
    fulfilment: fulfilment.kind,
    shippingAddress: fulfilment.kind === "shipping" ? { ...fulfilment.address, country: "CH" as const } : null,
  });
}

/** Releases what a checkout still holds (expired, failed or paid). */
async function releaseHolds(tx: Tx, paymentId: string) {
  const holds = await tx.select().from(stockHolds).where(eq(stockHolds.paymentId, paymentId));
  for (const hold of holds) {
    await tx.update(productVariants).set({ held: sql`greatest(${productVariants.held} - ${hold.quantity}, 0)` }).where(eq(productVariants.id, hold.variantId));
  }
  await tx.delete(stockHolds).where(eq(stockHolds.paymentId, paymentId));
}

/** Inside the settling transaction: the pieces leave the stock, the order is paid. */
export async function settleShop(tx: Tx, paymentId: string) {
  await releaseHolds(tx, paymentId);
  const items = await tx.select().from(paymentItems).where(and(eq(paymentItems.paymentId, paymentId), eq(paymentItems.type, "product")));
  for (const item of items) {
    if (!item.variantId) continue;
    await tx.update(productVariants).set({ stock: sql`${productVariants.stock} - ${item.quantity}` }).where(eq(productVariants.id, item.variantId));
  }
  await tx.update(orders).set({ status: "paid" }).where(and(eq(orders.paymentId, paymentId), eq(orders.status, "pending")));
}

/** A refunded order not yet handed over: cancelled, its pieces back in stock (full refunds only). */
export async function onShopRefund(paymentId: string, full: boolean) {
  if (!full) return;
  await db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.paymentId, paymentId)).for("update");
    if (!order || order.status === "handed_over" || order.status === "shipped" || order.status === "canceled") return;
    const items = await tx.select().from(paymentItems).where(and(eq(paymentItems.paymentId, paymentId), eq(paymentItems.type, "product")));
    for (const item of items) {
      if (!item.variantId) continue;
      await tx.update(productVariants).set({ stock: sql`${productVariants.stock} + ${item.quantity}` }).where(eq(productVariants.id, item.variantId));
    }
    await tx.update(orders).set({ status: "canceled" }).where(eq(orders.id, order.id));
  });
}

/** Worker: holds of checkouts left unpaid go back to the shelf, their orders are dropped. */
export async function releaseExpiredHolds() {
  const expired = await db
    .selectDistinct({ paymentId: stockHolds.paymentId })
    .from(stockHolds)
    .innerJoin(payments, eq(payments.id, stockHolds.paymentId))
    .where(and(lt(stockHolds.expiresAt, new Date()), inArray(payments.status, ["pending", "failed", "canceled"])));
  for (const { paymentId } of expired) {
    await db.transaction(async (tx) => {
      await releaseHolds(tx, paymentId);
      await tx.update(orders).set({ status: "canceled" }).where(and(eq(orders.paymentId, paymentId), eq(orders.status, "pending")));
    });
  }
}
