"use client";

import { useTranslations } from "next-intl";
import { ViewTransition } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { useSession } from "@/lib/auth-client";
import { hasRole } from "@/lib/roles";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  key: "home" | "news" | "matches" | "events" | "membership" | "contact" | "memberArea" | "admin";
};

const home: NavItem = { href: "/", key: "home" };
const content: NavItem[] = [
  { href: "/actualites", key: "news" },
  { href: "/matchs", key: "matches" },
  { href: "/evenements", key: "events" },
];
const contact: NavItem = { href: "/contact", key: "contact" };

/** Links depend on who is browsing: visitor, signed-in member, or admin. */
export function useNavItems(): NavItem[] {
  const { data } = useSession();
  // Visitors (and the first instant while the session loads) see the public menu.
  if (!data) return [home, ...content, { href: "/adhesion", key: "membership" }, contact];
  const member: NavItem[] = [home, ...content, { href: "/espace-membre", key: "memberArea" }, contact];
  return hasRole(data.user.role, "admin") ? [...member, { href: "/admin", key: "admin" }] : member;
}

/** Desktop navigation bar: same width as the content, hairlines above and below. */
export function MainNav() {
  const t = useTranslations("Nav");
  const pathname = usePathname();
  const items = useNavItems();

  return (
    <nav aria-label={t("label")} className="mx-auto hidden w-full max-w-5xl px-4 md:block">
      <ul className="flex h-10 items-stretch gap-7 border-y">
        {items.map(({ href, key }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={key} className="flex">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative inline-flex items-center font-wide text-[10px] font-semibold tracking-[0.08em] whitespace-nowrap uppercase transition-colors duration-300",
                  active
                    ? "text-psg-blue dark:text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t(key)}
                {active ? (
                  // Same name on every page: the browser slides the underline to the new tab.
                  <ViewTransition name="nav-underline" share="nav-underline" default="none">
                    <span
                      aria-hidden
                      className="absolute inset-x-0 -bottom-px h-0.5 bg-psg-blue dark:bg-foreground"
                    />
                  </ViewTransition>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
