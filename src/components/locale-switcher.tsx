"use client";

import { Check, LoaderCircle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { headerIconButtonClass } from "@/components/header-icon-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { flag } from "@/lib/flags";
import { cn } from "@/lib/utils";

/** Flag shown for each language in the menu. */
const FLAGS = { fr: flag("FR"), en: flag("GB"), de: flag("DE") } as const;

/**
 * Current language in the header; the others in a small menu. The menu closes at once and the
 * page switches language in a transition (spinner in the button meanwhile). The other
 * languages are only prefetched when the menu opens, not on every page.
 */
export function LocaleSwitcher() {
  const t = useTranslations("LocaleSwitcher");
  const current = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const choose = (locale: (typeof routing.locales)[number]) => {
    if (locale === current) return;
    startTransition(() => router.replace(pathname, { locale, scroll: false }));
  };

  return (
    <DropdownMenu
      modal={false}
      onOpenChange={(open) => {
        if (open) for (const locale of routing.locales) if (locale !== current) router.prefetch(pathname, { locale });
      }}
    >
      <DropdownMenuTrigger
        aria-label={`${t("label")} : ${t(current)}`}
        title={t("label")}
        className={`${headerIconButtonClass} font-wide text-[10px] font-semibold tracking-[0.06em] uppercase`}
      >
        {pending ? <LoaderCircle className="size-3 animate-spin" aria-hidden /> : current}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="group/locales w-max min-w-0 rounded-[12px] border-0 bg-card p-1.5 shadow-brand ring-1 ring-foreground/10 duration-150 ease-out data-open:zoom-in-[0.97] data-closed:zoom-out-[0.97]"
      >
        {routing.locales.map((locale) => {
          const active = locale === current;
          return (
            <DropdownMenuItem
              key={locale}
              lang={locale}
              aria-current={active ? "true" : undefined}
              onSelect={() => choose(locale)}
              className={cn(
                "flex cursor-pointer items-center gap-2.5 rounded-[8px] py-2 pr-2 pl-2.5 text-[13px]",
                // The current language is shaded until another one is hovered or focused.
                active && "bg-foreground/5 font-semibold not-focus:group-has-[:focus]/locales:bg-transparent",
              )}
            >
              <span aria-hidden className="text-[16px] leading-none">
                {FLAGS[locale]}
              </span>
              <span className="flex-1 pr-3">{t(locale)}</span>
              {/* Same room on every row, so the menu doesn't change width. */}
              <Check className={cn("size-3.5 text-muted-foreground", !active && "invisible")} aria-hidden />
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
