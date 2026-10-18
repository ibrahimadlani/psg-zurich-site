"use client";

import { Check, Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";

/**
 * Copies the club's address (some visitors have no mail app behind mailto links). `iconOnly`:
 * a round icon button, for a corner of the email card.
 */
export function CopyEmailButton({ email, iconOnly = false, className }: { email: string; iconOnly?: boolean; className?: string }) {
  const t = useTranslations("Contact");
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      notify.success(t("copied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Copying not allowed: the address stays visible to select by hand.
    }
  };

  if (iconOnly) {
    return (
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? t("copied") : t("copy")}
        title={t("copy")}
        className={cn(
          "grid size-9 cursor-pointer place-items-center rounded-full border bg-card text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground",
          className,
        )}
      >
        {copied ? <Check className="size-4 text-ok" aria-hidden /> : <Copy className="size-4" aria-hidden />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={cn("inline-flex h-[34px] cursor-pointer items-center gap-2 rounded-full border px-3.5 text-[13px] transition-colors hover:bg-foreground/5", className)}
    >
      {copied ? <Check className="size-[13px] text-ok" aria-hidden /> : <Copy className="size-[13px]" aria-hidden />}
      {copied ? t("copied") : t("copy")}
    </button>
  );
}
