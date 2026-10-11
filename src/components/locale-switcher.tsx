"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

export function LocaleSwitcher() {
  const t = useTranslations("LocaleSwitcher");
  const current = useLocale();
  const pathname = usePathname();

  return (
    <div role="group" aria-label={t("label")} className="inline-flex rounded-md border p-0.5">
      {routing.locales.map((locale) => (
        <Link
          key={locale}
          href={pathname}
          locale={locale}
          lang={locale}
          title={t(locale)}
          aria-current={locale === current ? "true" : undefined}
          className={cn(
            "rounded px-2.5 py-1 text-xs font-semibold uppercase text-muted-foreground transition-colors hover:text-foreground",
            locale === current && "bg-primary text-primary-foreground hover:text-primary-foreground",
          )}
        >
          {locale}
        </Link>
      ))}
    </div>
  );
}
