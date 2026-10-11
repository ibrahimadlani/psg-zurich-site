"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const SEGMENT_WIDTH = 36;

export function LocaleSwitcher() {
  const t = useTranslations("LocaleSwitcher");
  const current = useLocale();
  const pathname = usePathname();
  // Slide the pill as soon as a language is clicked, while the new locale loads.
  const [pending, setPending] = useState<{ from: AppLocale; to: AppLocale } | null>(null);
  const active = pending?.from === current ? pending.to : current;
  const index = Math.max(0, routing.locales.indexOf(active));

  return (
    <div
      role="group"
      aria-label={t("label")}
      className="relative inline-flex h-9 rounded-[8px] border bg-card p-0.5"
    >
      <span
        aria-hidden
        className="absolute top-0.5 left-0.5 h-[30px] w-9 rounded-[6px] bg-segment shadow-[0_1px_2px_oklch(0_0_0/0.12),0_2px_6px_-2px_oklch(0_0_0/0.18)] [transition:transform_.38s_cubic-bezier(.34,1.36,.5,1),background-color_.2s]"
        style={{ transform: `translateX(${index * SEGMENT_WIDTH}px)` }}
      />
      {routing.locales.map((locale) => (
        <Link
          key={locale}
          href={pathname}
          locale={locale}
          lang={locale}
          title={t(locale)}
          aria-current={locale === current ? "true" : undefined}
          onClick={() => setPending({ from: current, to: locale })}
          className={cn(
            "relative z-[1] h-[30px] w-9 rounded-[6px] text-center font-wide text-[11px] leading-[30px] font-semibold tracking-[0.04em] uppercase [-webkit-tap-highlight-color:transparent] [transition:color_.3s_ease,transform_.15s_ease] active:scale-[0.94]",
            locale === active ? "text-segment-foreground" : "text-muted-foreground",
          )}
        >
          {locale}
        </Link>
      ))}
    </div>
  );
}
