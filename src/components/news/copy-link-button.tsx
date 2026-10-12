"use client";

import { Check, Link2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

/** Copies the article's address (falls back to the share sheet where copying isn't allowed). */
export function CopyLinkButton() {
  const t = useTranslations("News");
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      await navigator.share?.({ url: window.location.href }).catch(() => undefined);
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex h-[34px] cursor-pointer items-center gap-2 rounded-full border px-3.5 text-[13px] transition-colors hover:bg-foreground/5"
    >
      {copied ? <Check className="size-[13px] text-ok" aria-hidden /> : <Link2 className="size-[13px]" aria-hidden />}
      {copied ? t("copied") : t("copy")}
    </button>
  );
}
