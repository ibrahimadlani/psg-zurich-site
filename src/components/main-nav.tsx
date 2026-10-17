"use client";

import { useTranslations } from "next-intl";
import { useLayoutEffect, useRef } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  key: "home" | "news" | "matches" | "events" | "shop" | "membership" | "contact" | "memberArea";
  /** Key page (membership / member area): last, pushed to the right of the desktop bar. */
  featured?: boolean;
  /** Page whose answer depends on the session (redirects): never prefetched. */
  authDependent?: boolean;
};

const home: NavItem = { href: "/", key: "home" };
const content: NavItem[] = [
  { href: "/actualites", key: "news" },
  { href: "/matchs", key: "matches" },
  { href: "/evenements", key: "events" },
];
// The shop is for members: only in the signed-in menu.
const shop: NavItem = { href: "/boutique", key: "shop", authDependent: true };
const contact: NavItem = { href: "/contact", key: "contact" };

/** Links depend on who is browsing: visitor or signed-in member (the committee reaches the admin from its account menu). */
export function useNavItems(): NavItem[] {
  const { data } = useSession();
  // Visitors (and the first instant while the session loads) see the public menu.
  if (!data) return [home, ...content, contact, { href: "/adhesion", key: "membership", featured: true, authDependent: true }];
  const memberArea: NavItem = { href: "/espace-membre", key: "memberArea", featured: true, authDependent: true };
  return [home, ...content, shop, contact, memberArea];
}

/** Small cockade in the club colours (PSG blue, white, red), marking the key page of the bar. */
export function Cockade() {
  return (
    <svg aria-hidden viewBox="-0.8 -0.8 13.6 13.6" className="size-3 shrink-0">
      {/* Thin white outer ring so the blue edge stays visible on the dark background. */}
      <circle cx="6" cy="6" r="6.4" fill="none" stroke="#fff" strokeWidth="0.8" className="hidden dark:block" />
      <circle cx="6" cy="6" r="6" fill="var(--color-psg-blue)" />
      <circle cx="6" cy="6" r="4.1" fill="#fff" />
      <circle cx="6" cy="6" r="2.9" fill="var(--color-psg-red)" />
    </svg>
  );
}

/** Desktop navigation bar: same width as the content, hairlines above and below. */
export function MainNav() {
  const t = useTranslations("Nav");
  const pathname = usePathname();
  const items = useNavItems();
  const listRef = useRef<HTMLUListElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);

  // One underline for the whole bar, slid under the active tab (CSS transition on transform/width).
  // It only slides when a tab is clicked; every other placement (first paint, fonts arriving,
  // menu items appearing once the session is known, resizes) is instant, so it never jumps.
  function moveBar(target: HTMLElement | null, animate = false) {
    const bar = barRef.current;
    if (!bar) return;
    if (!target) {
      bar.style.opacity = "0";
      return;
    }
    const width = `${target.offsetWidth}px`;
    const transform = `translateX(${target.offsetLeft}px)`;
    // Already there or on its way (a click just started the slide): let it finish.
    if (bar.style.opacity === "1" && bar.style.width === width && bar.style.transform === transform) return;
    if (!animate) bar.style.transition = "none";
    bar.style.opacity = "1";
    bar.style.width = width;
    bar.style.transform = transform;
    if (!animate) {
      void bar.offsetWidth; // apply the position before the transition comes back
      bar.style.transition = "";
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
        {items.map(({ href, key, featured, authDependent }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={key} className={cn("flex", featured && "ml-auto")}>
              <Link
                href={href}
                prefetch={authDependent ? false : undefined}
                aria-current={active ? "page" : undefined}
                // Slide right away, without waiting for the new page — except towards the
                // sign-up page, which has no navbar (the underline would slide for nothing).
                onClick={key === "membership" ? undefined : (event) => moveBar(event.currentTarget, true)}
                className={cn(
                  "relative inline-flex items-center gap-2 font-wide text-[10px] font-semibold tracking-[0.08em] whitespace-nowrap uppercase transition-colors duration-300",
                  active
                    ? "text-psg-blue dark:text-foreground"
                    : featured
                      ? "text-foreground hover:text-psg-blue dark:hover:text-foreground/80"
                      : "text-muted-foreground hover:text-foreground",
                )}
              >
                {featured ? <Cockade /> : null}
                {t(key)}
                {featured ? <Cockade /> : null}
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
