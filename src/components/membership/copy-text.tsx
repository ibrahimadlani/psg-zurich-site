"use client";

import { Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { notify } from "@/lib/notify";

/** Small "copy" button next to a payment detail (IBAN, reference…). */
export function CopyText({ value }: { value: string }) {
  const t = useTranslations("Dues");
  return (
    <button
      type="button"
      aria-label={t("copy")}
      title={t("copy")}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value.replace(/\s+/g, value.startsWith("CH") ? "" : " "));
          notify.success(t("copied"));
        } catch {
          // Copying not allowed: the value stays visible to select by hand.
        }
      }}
      className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-[7px] text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
    >
      <Copy className="size-3.5" aria-hidden />
    </button>
  );
}
