"use client";

import { ImagePlus, Plus, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { useConfirm } from "@/components/admin/ui/confirm-dialog";
import { ResponsivePanel } from "@/components/admin/ui/responsive-panel";
import { StatusPill } from "@/components/admin/ui/status-pill";
import { adminButton, adminCard, adminInput, adminLabel } from "@/components/admin/ui/styles";
import { useRouter } from "@/i18n/navigation";
import { uploadMedia } from "@/lib/image-resize";
import { formatChf } from "@/lib/money";
import { cn } from "@/lib/utils";

type Lang = "fr" | "en" | "de";
const LANGS: Lang[] = ["fr", "en", "de"];

export type AdminProduct = {
  id: string;
  slug: string;
  name: string;
  names: Record<Lang, string>;
  descriptions: Record<Lang, string>;
  detailsByLocale: Record<Lang, string> | null;
  price: number;
  images: string[];
  active: boolean;
  sortOrder: number;
  sizes: { id: string; label: string; sku: string | null; stock: number; held: number; available: number }[];
  sizeGuide: SizeGuide | null;
};

type SizeGuide = { columns: string[]; rows: string[][] };

type Draft = {
  id?: string;
  slug: string;
  names: Record<Lang, string>;
  descriptions: Record<Lang, string>;
  details: Record<Lang, string>;
  price: string;
  images: string[];
  active: boolean;
  sortOrder: number;
  variants: { id?: string; label: string; sku: string; stock: string }[];
  sizeGuide: SizeGuide | null;
};

const empty = (): Draft => ({
  slug: "",
  names: { fr: "", en: "", de: "" },
  descriptions: { fr: "", en: "", de: "" },
  details: { fr: "", en: "", de: "" },
  price: "",
  images: [],
  active: false,
  sortOrder: 0,
  variants: [{ label: "S", sku: "", stock: "0" }, { label: "M", sku: "", stock: "0" }, { label: "L", sku: "", stock: "0" }, { label: "XL", sku: "", stock: "0" }],
  sizeGuide: null,
});

const fromProduct = (product: AdminProduct): Draft => ({
  id: product.id,
  slug: product.slug,
  names: product.names,
  descriptions: product.descriptions,
  details: product.detailsByLocale ?? { fr: "", en: "", de: "" },
  price: (product.price / 100).toFixed(2),
  images: product.images,
  active: product.active,
  sortOrder: product.sortOrder,
  variants: product.sizes.map((size) => ({ id: size.id, label: size.label, sku: size.sku ?? "", stock: String(size.stock) })),
  sizeGuide: product.sizeGuide,
});

const slugify = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);

/** The shop's products: a list with stock at a glance, and a panel to edit one (photos, texts in three languages, sizes). */
export function ProductsAdmin({ products }: { products: AdminProduct[] }) {
  const t = useTranslations("AdminFinances");
  const router = useRouter();
  const confirm = useConfirm();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [lang, setLang] = useState<Lang>("fr");
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const update = (patch: Partial<Draft>) => setDraft((current) => (current ? { ...current, ...patch } : current));

  async function addImages(files: FileList | null) {
    if (!files?.length || !draft) return;
    setUploading(true);
    try {
      const ids: string[] = [];
      for (const file of Array.from(files)) ids.push((await uploadMedia(file, 1600)).id);
      setDraft((current) => (current ? { ...current, images: [...current.images, ...ids].slice(0, 8) } : current));
    } catch {
      toast.error(t("uploadError"));
    } finally {
      setUploading(false);
    }
  }

  function save() {
    if (!draft) return;
    const body = {
      slug: draft.slug || slugify(draft.names.fr),
      name: draft.names,
      description: draft.descriptions,
      details: Object.values(draft.details).some((value) => value.trim()) ? draft.details : null,
      price: Math.round(Number(draft.price.replace(",", ".")) * 100),
      images: draft.images,
      active: draft.active,
      sortOrder: draft.sortOrder,
      variants: draft.variants.filter((variant) => variant.label.trim()).map((variant) => ({ id: variant.id, label: variant.label.trim(), sku: variant.sku.trim() || undefined, stock: Math.max(0, Number(variant.stock) || 0) })),
      // Empty rows dropped; no columns left = no guide.
      sizeGuide: draft.sizeGuide?.columns.some((column) => column.trim())
        ? { columns: draft.sizeGuide.columns.map((column) => column.trim()), rows: draft.sizeGuide.rows.filter((row) => row.some((cell) => cell.trim())).map((row) => row.map((cell) => cell.trim())) }
        : null,
    };
    startTransition(async () => {
      const response = await fetch(draft.id ? `/api/v1/admin/products/${draft.id}` : "/api/v1/admin/products", {
        method: draft.id ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        toast.error(response.status === 409 ? t("slugTaken") : t("productError"));
        return;
      }
      toast.success(t("saved"));
      setDraft(null);
      router.refresh();
    });
  }

  async function remove() {
    if (!draft?.id) return;
    const answer = await confirm({ title: t("deleteProduct"), body: t("deleteProductBody"), confirmLabel: t("delete"), tone: "danger" });
    if (answer === null) return;
    startTransition(async () => {
      const response = await fetch(`/api/v1/admin/products/${draft.id}`, { method: "DELETE" });
      if (!response.ok) {
        toast.error(response.status === 409 ? t("hasSales") : t("productError"));
        return;
      }
      setDraft(null);
      router.refresh();
    });
  }

  const priceValid = Number(draft?.price.replace(",", ".")) >= 1;
  const valid = draft && draft.names.fr.trim() && draft.descriptions.fr.trim() && priceValid && draft.variants.some((variant) => variant.label.trim());

  return (
    <>
      <div className="mb-4 flex justify-end">
        <button type="button" onClick={() => setDraft(empty())} className={adminButton("primary")}>
          <Plus aria-hidden />
          {t("newProduct")}
        </button>
      </div>
      {products.length === 0 ? (
        <p className="rounded-[12px] border border-dashed px-4 py-10 text-center text-[14px] text-muted-foreground">{t("noProducts")}</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => {
            const stock = product.sizes.reduce((sum, size) => sum + size.stock, 0);
            return (
              <li key={product.id}>
                <button type="button" onClick={() => setDraft(fromProduct(product))} className={cn(adminCard, "flex w-full cursor-pointer gap-3 p-3 text-left transition-colors hover:border-foreground/25")}>
                  <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-[10px] bg-foreground/5">
                    {product.images[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element -- stored media, already sized
                      <img src={`/api/v1/media/${product.images[0]}`} alt="" className="size-full object-cover" />
                    ) : (
                      <ImagePlus className="size-5 text-muted-foreground" aria-hidden />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-semibold">{product.name}</span>
                      {product.active ? null : <StatusPill tone="neutral">{t("hidden")}</StatusPill>}
                    </span>
                    <span className="block text-[13px] tabular-nums">{formatChf(product.price)}</span>
                    <span className={cn("block text-[12px]", stock === 0 ? "text-destructive" : "text-muted-foreground")}>
                      {product.sizes.map((size) => `${size.label} ${size.available}`).join(" · ")}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <ResponsivePanel
        open={draft !== null}
        onOpenChange={(open) => (open ? null : setDraft(null))}
        title={draft?.id ? t("editProduct") : t("newProduct")}
        footer={
          <>
            {draft?.id ? (
              <button type="button" disabled={pending} onClick={remove} className={adminButton("ghost", "md", "sm:mr-auto")}>
                <Trash2 aria-hidden />
                {t("delete")}
              </button>
            ) : null}
            <button type="button" disabled={pending || !valid} onClick={save} className={adminButton("primary")}>
              {t("save")}
            </button>
          </>
        }
      >
        {draft ? (
          <div className="flex flex-col gap-6">
            {/* Photos: the first one is the cover. */}
            <section className="space-y-2">
              <p className={adminLabel}>{t("photos")}</p>
              <div className="grid grid-cols-4 gap-2">
                {draft.images.map((image, index) => (
                  <div key={image} className="group relative aspect-square overflow-hidden rounded-[10px] border bg-foreground/5">
                    {/* eslint-disable-next-line @next/next/no-img-element -- stored media */}
                    <img src={`/api/v1/media/${image}`} alt="" className="size-full object-cover" />
                    {index === 0 ? <span className="absolute bottom-1 left-1 rounded-full bg-background/90 px-1.5 text-[10px] font-semibold">{t("cover")}</span> : null}
                    <button
                      type="button"
                      aria-label={t("removePhoto")}
                      onClick={() => update({ images: draft.images.filter((other) => other !== image) })}
                      className="absolute top-1 right-1 grid size-6 cursor-pointer place-items-center rounded-full bg-background/90 text-foreground"
                    >
                      <X className="size-3.5" aria-hidden />
                    </button>
                  </div>
                ))}
                {draft.images.length < 8 ? (
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => fileInput.current?.click()}
                    className="grid aspect-square cursor-pointer place-items-center rounded-[10px] border border-dashed text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
                  >
                    <ImagePlus className={cn("size-5", uploading && "animate-pulse")} aria-hidden />
                    <span className="sr-only">{t("addPhoto")}</span>
                  </button>
                ) : null}
              </div>
              <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={(event) => void addImages(event.target.files)} />
            </section>

            {/* Texts, one language at a time. */}
            <section className="space-y-3">
              <div className="flex gap-1.5">
                {LANGS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setLang(value)}
                    className={cn("h-8 cursor-pointer rounded-full border px-3 text-[12px] font-semibold uppercase", lang === value ? "border-foreground bg-foreground text-background" : "bg-card text-muted-foreground")}
                  >
                    {value}
                    {value === "fr" ? " *" : ""}
                  </button>
                ))}
              </div>
              <label className="flex flex-col gap-1.5">
                <span className={adminLabel}>{t("productName")}</span>
                <input
                  value={draft.names[lang]}
                  maxLength={120}
                  onChange={(event) =>
                    update({ names: { ...draft.names, [lang]: event.target.value }, ...(lang === "fr" && !draft.id ? { slug: slugify(event.target.value) } : {}) })
                  }
                  className={adminInput}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={adminLabel}>{t("productDescription")}</span>
                <textarea value={draft.descriptions[lang]} maxLength={2000} rows={4} onChange={(event) => update({ descriptions: { ...draft.descriptions, [lang]: event.target.value } })} className={`${adminInput} h-auto py-2`} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={adminLabel}>{t("productDetails")}</span>
                <textarea
                  value={draft.details[lang]}
                  maxLength={1000}
                  rows={4}
                  placeholder={t("productDetailsPlaceholder")}
                  onChange={(event) => update({ details: { ...draft.details, [lang]: event.target.value } })}
                  className={`${adminInput} h-auto py-2`}
                />
                <span className="text-[12px] text-muted-foreground">{t("productDetailsHint")}</span>
              </label>
            </section>

            <section className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className={adminLabel}>{t("price")}</span>
                <input inputMode="decimal" value={draft.price} onChange={(event) => update({ price: event.target.value.replace(/[^\d.,]/g, "") })} placeholder="45.00" className={cn(adminInput, "tabular-nums")} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={adminLabel}>{t("slug")}</span>
                <input value={draft.slug} onChange={(event) => update({ slug: slugify(event.target.value) })} className={cn(adminInput, "font-mono text-[13px]")} />
              </label>
            </section>

            {/* Sizes with their stock. */}
            <section className="space-y-2">
              <p className={adminLabel}>{t("sizes")}</p>
              <ul className="flex flex-col gap-2">
                {draft.variants.map((variant, index) => (
                  <li key={variant.id ?? `new-${index}`} className="grid grid-cols-[1fr_5rem_1fr_auto] items-center gap-2">
                    <input aria-label={t("sizeLabel")} placeholder={t("sizeLabel")} value={variant.label} maxLength={40} onChange={(event) => update({ variants: draft.variants.map((item, at) => (at === index ? { ...item, label: event.target.value } : item)) })} className={adminInput} />
                    <input aria-label={t("stock")} inputMode="numeric" value={variant.stock} onChange={(event) => update({ variants: draft.variants.map((item, at) => (at === index ? { ...item, stock: event.target.value.replace(/\D/g, "") } : item)) })} className={cn(adminInput, "tabular-nums")} />
                    <input aria-label="SKU" placeholder="SKU" value={variant.sku} maxLength={60} onChange={(event) => update({ variants: draft.variants.map((item, at) => (at === index ? { ...item, sku: event.target.value } : item)) })} className={cn(adminInput, "font-mono text-[13px]")} />
                    <button type="button" aria-label={t("removeSize")} onClick={() => update({ variants: draft.variants.filter((_, at) => at !== index) })} className={adminButton("ghost", "icon")}>
                      <X aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
              <button type="button" onClick={() => update({ variants: [...draft.variants, { label: "", sku: "", stock: "0" }] })} className={adminButton("secondary", "sm")}>
                <Plus aria-hidden />
                {t("addSize")}
              </button>
              <p className="text-[12px] text-muted-foreground">{t("sizesHint")}</p>
            </section>

            <SizeGuideEditor
              guide={draft.sizeGuide}
              sizes={draft.variants.map((variant) => variant.label).filter(Boolean)}
              onChange={(sizeGuide) => update({ sizeGuide })}
            />

            <label className="flex cursor-pointer items-start gap-3 text-[14px]">
              <input type="checkbox" checked={draft.active} onChange={(event) => update({ active: event.target.checked })} className="mt-0.5 size-4 accent-[var(--color-psg-blue)]" />
              <span>
                <span className="font-semibold">{t("active")}</span>
                <span className="block text-[13px] text-muted-foreground">{t("activeHint")}</span>
              </span>
            </label>
          </div>
        ) : null}
      </ResponsivePanel>
    </>
  );
}

/** The product's size chart: a small table of free cells (sizes down, measurements across). */
function SizeGuideEditor({ guide, sizes, onChange }: { guide: SizeGuide | null; sizes: string[]; onChange: (guide: SizeGuide | null) => void }) {
  const t = useTranslations("AdminFinances");
  if (!guide) {
    return (
      <section className="space-y-2">
        <p className={adminLabel}>{t("sizeGuide")}</p>
        <button
          type="button"
          onClick={() => onChange({ columns: [t("sizeGuideSize"), t("sizeGuideChest"), t("sizeGuideLength")], rows: (sizes.length ? sizes : ["S", "M", "L"]).map((size) => [size, "", ""]) })}
          className={adminButton("secondary", "sm")}
        >
          <Plus aria-hidden />
          {t("sizeGuideAdd")}
        </button>
      </section>
    );
  }
  const setCell = (row: number, column: number, value: string) => onChange({ ...guide, rows: guide.rows.map((cells, at) => (at === row ? guide.columns.map((_, index) => (index === column ? value : (cells[index] ?? ""))) : cells)) });
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className={adminLabel}>{t("sizeGuide")}</p>
        <button type="button" onClick={() => onChange(null)} className={adminButton("ghost", "sm")}>
          {t("sizeGuideRemove")}
        </button>
      </div>
      <div className="overflow-x-auto rounded-[10px] border">
        <table className="w-full text-[13px]">
          <thead>
            <tr>
              {guide.columns.map((column, index) => (
                <th key={index} className="border-b p-1">
                  <input
                    aria-label={t("sizeGuideColumn")}
                    value={column}
                    maxLength={40}
                    onChange={(event) => onChange({ ...guide, columns: guide.columns.map((value, at) => (at === index ? event.target.value : value)) })}
                    className={cn(adminInput, "h-9 font-semibold lg:h-8")}
                  />
                </th>
              ))}
              <th className="w-10 border-b p-1">
                {guide.columns.length < 8 ? (
                  <button type="button" aria-label={t("sizeGuideAddColumn")} onClick={() => onChange({ columns: [...guide.columns, ""], rows: guide.rows.map((row) => [...row, ""]) })} className={adminButton("ghost", "icon")}>
                    <Plus aria-hidden />
                  </button>
                ) : null}
              </th>
            </tr>
          </thead>
          <tbody>
            {guide.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {guide.columns.map((_, columnIndex) => (
                  <td key={columnIndex} className="p-1">
                    <input aria-label={t("sizeGuideCell")} value={row[columnIndex] ?? ""} maxLength={40} onChange={(event) => setCell(rowIndex, columnIndex, event.target.value)} className={cn(adminInput, "h-9 tabular-nums lg:h-8")} />
                  </td>
                ))}
                <td className="p-1">
                  <button type="button" aria-label={t("sizeGuideRemoveRow")} onClick={() => onChange({ ...guide, rows: guide.rows.filter((_, at) => at !== rowIndex) })} className={adminButton("ghost", "icon")}>
                    <X aria-hidden />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {guide.rows.length < 20 ? (
        <button type="button" onClick={() => onChange({ ...guide, rows: [...guide.rows, guide.columns.map(() => "")] })} className={adminButton("secondary", "sm")}>
          <Plus aria-hidden />
          {t("sizeGuideAddRow")}
        </button>
      ) : null}
    </section>
  );
}
