"use client";

import { Check } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { headerIconButtonClass } from "@/components/header-icon-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

/** Shows only the current language; the others are in a small menu. */
export function LocaleSwitcher() {
  const t = useTranslations("LocaleSwitcher");
  const current = useLocale();
  const pathname = usePathname();

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        aria-label={`${t("label")} : ${t(current)}`}
        title={t("label")}
        className={`${headerIconButtonClass} font-wide text-[10px] font-semibold tracking-[0.06em] uppercase`}
      >
        {current}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6} className="min-w-36">
        {routing.locales.map((locale) => (
          <DropdownMenuItem key={locale} asChild>
            <Link
              href={pathname}
              locale={locale}
              lang={locale}
              aria-current={locale === current ? "true" : undefined}
              className="flex items-center gap-3"
            >
              <span className="w-5 font-wide text-[10px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
                {locale}
              </span>
              <span className="flex-1">{t(locale)}</span>
              {locale === current ? <Check className="size-3.5" aria-hidden /> : null}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
