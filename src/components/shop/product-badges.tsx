import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";

/** "Sold out", "Last pieces" or "New", the one that matters most. */
export async function ProductBadge({ product, className }: { product: { soldOut: boolean; fewLeft: boolean; isNew: boolean }; className?: string }) {
  const t = await getTranslations("Shop");
  const badge = product.soldOut
    ? { label: t("soldOut"), tone: "bg-background/90 text-foreground" }
    : product.fewLeft
      ? { label: t("lastPieces"), tone: "bg-psg-red text-white" }
      : product.isNew
        ? { label: t("new"), tone: "bg-psg-blue text-white dark:bg-white dark:text-psg-blue" }
        : null;
  if (!badge) return null;
  return (
    <span className={cn("inline-flex h-6 items-center rounded-full px-2.5 font-wide text-[9px] font-semibold tracking-[0.08em] uppercase shadow-sm backdrop-blur", badge.tone, className)}>
      {badge.label}
    </span>
  );
}
