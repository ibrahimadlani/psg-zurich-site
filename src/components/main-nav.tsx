"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export const NAV_ITEMS = [
  { href: "/", key: "home" },
  { href: "/actualites", key: "news" },
  { href: "/matchs", key: "matches" },
  { href: "/evenements", key: "events" },
  { href: "/adhesion", key: "membership" },
  { href: "/contact", key: "contact" },
  { href: "/espace-membre", key: "memberArea" },
] as const;

export function MainNav() {
  const t = useTranslations("Nav");
  const pathname = usePathname();

  return (
    <nav aria-label={t("label")} className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden">
      <ul className="flex gap-1 whitespace-nowrap">
        {NAV_ITEMS.map(({ href, key }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={key}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                  active && "bg-primary/10 text-primary",
                )}
              >
                {t(key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
