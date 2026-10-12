"use client";

import { useTranslations } from "next-intl";
import { useLayoutEffect, useRef } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { useSession } from "@/lib/auth-client";
import { hasRole } from "@/lib/roles";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  key: "home" | "news" | "matches" | "events" | "membership" | "contact" | "memberArea" | "admin";
  /** Key page (membership / member area): last, pushed to the right of the desktop bar. */
  featured?: boolean;
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
  if (!data) return [home, ...content, contact, { href: "/adhesion", key: "membership", featured: true }];
  const memberArea: NavItem = { href: "/espace-membre", key: "memberArea", featured: true };
  return hasRole(data.user.role, "admin")
    ? [home, ...content, contact, { href: "/admin", key: "admin" }, memberArea]
    : [home, ...content, contact, memberArea];
}

/** Desktop navigation bar: same width as the content, hairlines above and below. */
export function MainNav() {
  const t = useTranslations("Nav");
  const pathname = usePathname();
  const items = useNavItems();
  const listRef = useRef<HTMLUListElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);

  // One underline for the whole bar, slid under the active tab (CSS transition on transform/width).
  function moveBar(target: HTMLElement | null) {
    const bar = barRef.current;
    if (!bar) return;
    if (!target) {
      bar.style.opacity = "0";
      return;
    }
    const firstPlacement = bar.dataset.placed !== "true";
    if (firstPlacement) bar.style.transition = "none";
    bar.style.opacity = "1";
    bar.style.width = `${target.offsetWidth}px`;
    bar.style.transform = `translateX(${target.offsetLeft}px)`;
    if (firstPlacement) {
      void bar.offsetWidth; // apply the initial position without animating it
      bar.style.transition = "";
      bar.dataset.placed = "true";
    }
  }

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const place = () => moveBar(list.querySelector<HTMLElement>('a[aria-current="page"]'));
    place();
    // Fonts loading or the window resizing change the link widths.
    const observer = new ResizeObserver(place);
    observer.observe(list);
    return () => observer.disconnect();
  }, [pathname, items.length]);

  return (
    <nav aria-label={t("label")} className="mx-auto hidden w-full max-w-5xl px-4 md:block">
      <ul ref={listRef} className="relative flex h-10 items-stretch gap-7 border-y">
        {items.map(({ href, key, featured }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={key} className={cn("flex", featured && "ml-auto")}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                // Slide right away, without waiting for the new page.
                onClick={(event) => moveBar(event.currentTarget)}
                className={cn(
                  "relative inline-flex items-center gap-2 font-wide text-[10px] font-semibold tracking-[0.08em] whitespace-nowrap uppercase transition-colors duration-300",
                  active
                    ? "text-psg-blue dark:text-foreground"
                    : featured
                      ? "text-foreground hover:text-psg-blue dark:hover:text-foreground/80"
                      : "text-muted-foreground hover:text-foreground",
                )}
              >
                {featured ? <span aria-hidden className="size-1.5 rounded-full bg-psg-red" /> : null}
                {t(key)}
              </Link>
            </li>
          );
        })}
        <span
          ref={barRef}
          aria-hidden
          className="pointer-events-none absolute -bottom-px left-0 h-0.5 bg-psg-blue opacity-0 [transition:transform_.38s_cubic-bezier(.34,1.2,.5,1),width_.38s_cubic-bezier(.34,1.2,.5,1),opacity_.2s] motion-reduce:transition-none dark:bg-foreground"
        />
      </ul>
    </nav>
  );
}
