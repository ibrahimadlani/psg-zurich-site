"use client";

import { Check, Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

/** Copies the club's address (some visitors have no mail app behind mailto links). */
export function CopyEmailButton({ email }: { email: string }) {
  const t = useTranslations("Contact");
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Copying not allowed: the address stays visible to select by hand.
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex h-[34px] cursor-pointer items-center gap-2 rounded-full border px-3.5 text-[13px] transition-colors hover:bg-foreground/5"
    >
      {copied ? <Check className="size-[13px] text-ok" aria-hidden /> : <Copy className="size-[13px]" aria-hidden />}
      {copied ? t("copied") : t("copy")}
    </button>
  );
}
