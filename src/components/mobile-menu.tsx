"use client";

import { ArrowRight, Moon, Sun } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { NAV_ITEMS } from "@/components/main-nav";
import { toggleTheme } from "@/components/theme-toggle";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const line = "absolute left-0 top-1/2 -mt-px block h-[1.5px] w-full rounded-full bg-current";

/** Three lines + label. `closing` plays the hamburger → cross animation on mount. */
function Burger({ label, closing = false }: { label: string; closing?: boolean }) {
  return (
    <span className="flex flex-col items-center gap-[7px]">
      <span aria-hidden className="relative block h-3.5 w-6">
        <span
          className={cn(line, closing ? "animate-burger-top" : "-translate-y-1.5")}
        />
        <span className={cn(line, closing && "animate-burger-middle")} />
        <span
          className={cn(line, closing ? "animate-burger-bottom" : "translate-y-1.5")}
        />
      </span>
      {/* Same type as the logo's "Supporters Club" line. */}
      <span className="-mr-[0.08em] font-wide text-[length:clamp(6px,1.75vw,7.4px)] leading-none font-semibold tracking-[0.08em] whitespace-nowrap uppercase">
        {label}
      </span>
    </span>
  );
}

const burgerButton =
  "-mr-1.5 grid h-11 min-w-11 cursor-pointer place-items-center rounded-[8px] px-1.5 text-foreground outline-none transition-colors hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-ring/50";

export function MobileMenu() {
  const t = useTranslations("Nav");
  const tLocale = useTranslations("LocaleSwitcher");
  const tTheme = useTranslations("ThemeToggle");
  const tLogin = useTranslations("Login");
  const locale = useLocale();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className={burgerButton} aria-label={t("menu")}>
        <Burger label={t("menu")} />
      </SheetTrigger>
      <SheetContent
        side="right"
        showCloseButton={false}
        aria-describedby={undefined}
        className="w-[88vw] max-w-sm gap-0 border-l-0 bg-background p-0 duration-300 data-[side=right]:data-closed:slide-out-to-right data-[side=right]:data-open:slide-in-from-right"
        // Any link inside closes the menu (navigation keeps this component mounted).
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("a")) setOpen(false);
        }}
      >
        <SheetTitle className="sr-only">{t("label")}</SheetTitle>

        <div className="flex items-center justify-between gap-2 px-4 py-[clamp(12px,3vw,16px)]">
          <BrandLogo />
          <SheetClose className={burgerButton} aria-label={t("close")}>
            <Burger label={t("close")} closing />
          </SheetClose>
        </div>

        <nav aria-label={t("label")} className="flex-1 overflow-y-auto px-6 pt-6">
          <ul className="space-y-1">
            {NAV_ITEMS.map(({ href, key }, index) => {
              const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <li
                  key={key}
                  className="animate-in fade-in-0 slide-in-from-right-4 fill-mode-both duration-300"
                  style={{ animationDelay: `${80 + index * 35}ms` }}
                >
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group flex items-center gap-3 py-1.5 font-narrow text-[32px] leading-none font-extrabold uppercase italic transition-colors",
                      active ? "text-primary" : "text-foreground hover:text-primary",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "size-1.5 shrink-0 rounded-full bg-brand-red transition-opacity",
                        active ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                      )}
                    />
                    {t(key)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="space-y-4 border-t px-6 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center justify-between gap-3">
            <div role="group" aria-label={tLocale("label")} className="flex gap-1">
              {routing.locales.map((code) => (
                <Link
                  key={code}
                  href={pathname}
                  locale={code}
                  lang={code}
                  title={tLocale(code)}
                  aria-current={code === locale ? "true" : undefined}
                  className={cn(
                    "grid h-8 min-w-10 place-items-center rounded-[7px] px-2 font-wide text-[10px] font-semibold tracking-[0.06em] uppercase transition-colors",
                    code === locale
                      ? "bg-segment text-segment-foreground"
                      : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
                  )}
                >
                  {code}
                </Link>
              ))}
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={tTheme("label")}
              className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-[7px] px-2.5 text-[13px] text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
            >
              <Sun className="hidden size-3.5 dark:block" aria-hidden />
              <Moon className="size-3.5 dark:hidden" aria-hidden />
              {tTheme("short")}
            </button>
          </div>
          {pathname.startsWith("/connexion") ? null : (
            <Link
              href="/espace-membre"
              className="group flex h-11 items-center justify-center gap-2 rounded-[8px] bg-segment font-wide text-[11px] font-semibold tracking-[0.06em] text-segment-foreground uppercase shadow-brand transition-opacity hover:opacity-90"
            >
              {tLogin("submit")}
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
