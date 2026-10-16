import "server-only";
import { and, eq, inArray, notInArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { paymentItems, productVariants, products } from "@/db/schema";
import { writeAuditLog } from "@/lib/audit";
import { HttpError } from "@/lib/permissions";

const text = (max: number) => z.string().trim().max(max);
const translated = (max: number) => z.object({ fr: text(max).min(1), en: text(max), de: text(max) });

export const productSchema = z.object({
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120),
  name: translated(120),
  description: translated(2000),
  price: z.number().int().min(100).max(100_000_00),
  images: z.array(z.uuid()).max(8),
  active: z.boolean(),
  sortOrder: z.number().int().min(0).max(999).default(0),
  variants: z
    .array(z.object({ id: z.uuid().optional(), label: text(40).min(1), sku: text(60).optional(), stock: z.number().int().min(0).max(100_000) }))
    .min(1)
    .max(20),
});
export type ProductInput = z.infer<typeof productSchema>;

/** Creates or updates a product with its sizes (sizes already sold keep their id). */
export async function saveProduct(input: ProductInput, { id, actorId, ipAddress }: { id?: string; actorId: string; ipAddress: string | null }) {
  const productId = id ?? crypto.randomUUID();
  await db.transaction(async (tx) => {
    const values = { slug: input.slug, name: input.name, description: input.description, price: input.price, images: input.images, active: input.active, sortOrder: input.sortOrder };
    if (id) {
      const [existing] = await tx.select({ id: products.id }).from(products).where(eq(products.id, id));
      if (!existing) throw new HttpError(404, "not_found", "Product not found.");
      await tx.update(products).set(values).where(eq(products.id, id));
    } else {
      await tx.insert(products).values({ id: productId, ...values });
    }
    const keep = input.variants.filter((variant) => variant.id).map((variant) => variant.id!);
    // Sizes taken away: removed (their sales keep their written description).
    await tx.delete(productVariants).where(and(eq(productVariants.productId, productId), keep.length ? notInArray(productVariants.id, keep) : undefined));
    for (const [index, variant] of input.variants.entries()) {
      const row = { label: variant.label, sku: variant.sku || null, stock: variant.stock, sortOrder: index };
      if (variant.id) await tx.update(productVariants).set(row).where(and(eq(productVariants.id, variant.id), eq(productVariants.productId, productId)));
      else await tx.insert(productVariants).values({ productId, ...row });
    }
    await writeAuditLog(
      { actorId, action: id ? "payment.product_updated" : "payment.product_created", entityType: "product", entityId: productId, metadata: { slug: input.slug, price: input.price, active: input.active, stock: input.variants.map((variant) => `${variant.label}:${variant.stock}`) }, ipAddress },
      tx,
    );
  });
  return productId;
}

/** A product never sold can be deleted; one that was sold is taken off the shop instead. */
export async function deleteProduct(id: string, { actorId, ipAddress }: { actorId: string; ipAddress: string | null }) {
  const variants = await db.select({ id: productVariants.id }).from(productVariants).where(eq(productVariants.productId, id));
  const [sold] = variants.length ? await db.select({ id: paymentItems.id }).from(paymentItems).where(inArray(paymentItems.variantId, variants.map((variant) => variant.id))).limit(1) : [];
  if (sold) throw new HttpError(409, "has_sales", "This product was sold: take it off the shop instead.");
  await db.delete(products).where(eq(products.id, id));
  await writeAuditLog({ actorId, action: "payment.product_deleted", entityType: "product", entityId: id, ipAddress });
}
