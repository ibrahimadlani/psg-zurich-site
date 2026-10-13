"use client";

import { LayoutDashboard, LogOut, Monitor, Moon, QrCode, Settings, Sun, Target } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { useNavItems } from "@/components/main-nav";
import { readThemePreference, setThemePreference, type ThemePreference } from "@/components/theme-toggle";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { UserAvatar } from "@/components/user-avatar";
import { useSignOut } from "@/components/user-nav";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { useSession } from "@/lib/auth-client";
import type { EventAccess } from "@/lib/dues";
import { hasRole } from "@/lib/roles";
import { cn } from "@/lib/utils";

const line = "absolute left-0 top-1/2 -mt-[1.25px] block h-[2.5px] w-full rounded-full bg-current";

/** Three lines in a square. `closing` plays the hamburger → cross animation on mount. */
function Burger({ closing = false }: { closing?: boolean }) {
  return (
    <span aria-hidden className="relative block h-3.5 w-[22px]">
      <span className={cn(line, closing ? "animate-burger-top" : "-translate-y-1.5")} />
      <span className={cn(line, closing && "animate-burger-middle")} />
      <span className={cn(line, closing ? "animate-burger-bottom" : "translate-y-1.5")} />
    </span>
  );
}

// Square, as tall as the crest at its largest (36px), so it sits centred on the logo.
const burgerButton =
  "grid size-9 shrink-0 cursor-pointer place-items-center rounded-[8px] text-psg-blue outline-none transition-colors hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-ring/50 dark:text-white";

type MenuData = { access: EventAccess; latestNewsAt: string | null; upcomingEvents: number | null };

/** Last visit to the news page, to flag articles published since. */
const NEWS_SEEN_KEY = "psgz-news-seen-at";
const readNewsSeen = () => {
  try {
    return localStorage.getItem(NEWS_SEEN_KEY);
  } catch {
    return null;
  }
};

/** Stagger of the menu's entrance: each block a beat after the previous one. */
const enter = (index: number) => ({
  className: "animate-in fade-in-0 slide-in-from-right-4 fill-mode-both duration-300 motion-reduce:slide-in-from-right-0",
  style: { animationDelay: `${60 + index * 35}ms` },
});

export function MobileMenu() {
  const t = useTranslations("Nav");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<MenuData | null>(null);
  const [newsSeen, setNewsSeen] = useState<string | null>(null);
  const navItems = useNavItems().filter((item) => item.key !== "admin" && item.key !== "memberArea" && item.key !== "membership");

  // Reading the news page counts as seeing the news.
  useEffect(() => {
    if (!pathname.startsWith("/actualites")) return;
    try {
      localStorage.setItem(NEWS_SEEN_KEY, new Date().toISOString());
    } catch {
      // Private mode: the dot simply comes back.
    }
  }, [pathname]);

  const openChange = (next: boolean) => {
    setOpen(next);
    if (!next) return;
    setNewsSeen(readNewsSeen());
    // Fresh each time it opens (score, status): one small database-only request.
    fetch("/api/v1/menu")
      .then((response) => (response.ok ? (response.json() as Promise<{ data: MenuData }>) : null))
      .then((body) => body && setData(body.data))
      .catch(() => {});
  };

  // Swipe right to close: the panel follows the finger, closes past a third of its width.
  const panel = useRef<HTMLDivElement>(null);

  // The spine: a hairline down from the bottom of the crest, along the links. The PSG banner
  // slides on it to the hovered / focused link, else to the current page.
  const header = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const links = useRef<(HTMLAnchorElement | null)[]>([]);
  const [spine, setSpine] = useState<{ x: number; top: number; centers: number[] } | null>(null);
  const [settled, setSettled] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);
  useEffect(() => {
    if (!open) return;
    const measure = () => {
      const root = panel.current;
      const crest = header.current?.querySelector("img");
      if (!root || !crest) return;
      const base = root.getBoundingClientRect();
      const box = crest.getBoundingClientRect();
      setSpine({
        x: box.left - base.left + box.width / 2,
        top: box.bottom - base.top,
        centers: links.current.map((link) => (link ? link.getBoundingClientRect().top - base.top + link.offsetHeight / 2 : 0)),
      });
    };
    let frame = requestAnimationFrame(() => {
      measure();
      // Next frame: the banner leaves the crest and slides down to its link.
      frame = requestAnimationFrame(() => setSettled(true));
    });
    const observer = new ResizeObserver(measure);
    if (panel.current) observer.observe(panel.current);
    const area = scroller.current;
    area?.addEventListener("scroll", measure, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      area?.removeEventListener("scroll", measure);
      setSettled(false);
      setHovered(null);
    };
  }, [open]);
  const drag = useRef<{ x: number; y: number; dx: number; active: boolean } | null>(null);
  const onPointerDown = (event: React.PointerEvent) => {
    if (event.pointerType === "mouse") return;
    drag.current = { x: event.clientX, y: event.clientY, dx: 0, active: false };
  };
  const onPointerMove = (event: React.PointerEvent) => {
    const state = drag.current;
    const element = panel.current;
    if (!state || !element) return;
    const dx = event.clientX - state.x;
    const dy = event.clientY - state.y;
    // Only a mostly horizontal move to the right drags; vertical moves keep scrolling.
    if (!state.active) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) return void (drag.current = null);
      if (dx < 10) return;
      state.active = true;
    }
    state.dx = Math.max(0, dx);
    element.style.transition = "none";
    element.style.transform = `translateX(${state.dx}px)`;
  };
  const onPointerUp = () => {
    const state = drag.current;
    const element = panel.current;
    drag.current = null;
    if (!state?.active || !element) return;
    element.style.transition = "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)";
    if (state.dx > element.offsetWidth / 3) {
      element.style.transform = "translateX(100%)";
      window.setTimeout(() => {
        setOpen(false);
        element.style.transform = "";
        element.style.transition = "";
      }, 200);
    } else element.style.transform = "";
  };

  const activeIndex = navItems.findIndex(({ href }) => (href === "/" ? pathname === "/" : pathname.startsWith(href)));
  const newsUnread = Boolean(data?.latestNewsAt && (!newsSeen || data.latestNewsAt > newsSeen));
  const badge = (key: string) => {
    if (key === "news" && newsUnread) return <span className="size-2 rounded-full bg-psg-red" aria-label={t("drawer.new")} />;
    if (key === "events" && data?.upcomingEvents) {
      // Just the number (the label is long enough already): the full wording for screen readers.
      return (
        <span
          aria-label={t("drawer.upcoming", { count: data.upcomingEvents })}
          title={t("drawer.upcoming", { count: data.upcomingEvents })}
          className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-foreground/10 px-1.5 text-[11px] font-semibold tabular-nums"
        >
          {data.upcomingEvents}
        </span>
      );
    }
    return null;
  };

  return (
    <Sheet open={open} onOpenChange={openChange}>
      <SheetTrigger className={burgerButton} aria-label={t("menu")}>
        <Burger />
      </SheetTrigger>
      <SheetContent
        ref={panel}
        side="right"
        showCloseButton={false}
        aria-describedby={undefined}
        className="w-[88vw] max-w-sm touch-pan-y gap-0 border-l-0 bg-background p-0 duration-300 data-[side=right]:data-closed:slide-out-to-right data-[side=right]:data-open:slide-in-from-right"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        // Any link (or [data-close-menu] control) inside closes the menu (navigation keeps this component mounted).
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("a, [data-close-menu]")) setOpen(false);
        }}
      >
        <SheetTitle className="sr-only">{t("label")}</SheetTitle>

        <div ref={header} className="flex items-center justify-between gap-2 border-b px-4 py-[clamp(12px,3vw,16px)]">
          <BrandLogo />
          <SheetClose className={burgerButton} aria-label={t("close")}>
            <Burger closing />
          </SheetClose>
        </div>

        <div ref={scroller} className="flex-1 overflow-y-auto">
          <nav
            aria-label={t("label")}
            className="px-6 pt-5 pb-4"
            onMouseLeave={() => setHovered(null)}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHovered(null);
            }}
          >
            <ul className="space-y-0.5">
              {navItems.map(({ href, key, authDependent }, index) => {
                const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
                const motion = enter(index);
                return (
                  <li key={key} className={motion.className} style={motion.style}>
                    <Link
                      href={href}
                      prefetch={authDependent ? false : undefined}
                      aria-current={active ? "page" : undefined}
                      ref={(element) => {
                        links.current[index] = element;
                      }}
                      onMouseEnter={() => setHovered(index)}
                      onFocus={() => setHovered(index)}
                      className="group relative flex items-center gap-3 py-1.5 pl-7"
                    >
                      <span
                        className={cn(
                          "font-narrow text-[32px] leading-none font-extrabold uppercase italic transition-colors",
                          active ? "text-foreground" : "text-foreground/55 group-hover:text-foreground",
                        )}
                      >
                        {t(key)}
                      </span>
                      {badge(key)}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        <Spine spine={spine} settled={settled} target={hovered ?? (activeIndex === -1 ? null : activeIndex)} />

        <div className="space-y-4 border-t px-4 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <AccountBlock access={data?.access ?? null} motionIndex={navItems.length} />
          <Preferences />
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** Hairline from the crest down the links, and the PSG banner sliding on it. */
function Spine({
  spine,
  settled,
  target,
}: {
  spine: { x: number; top: number; centers: number[] } | null;
  settled: boolean;
  target: number | null;
}) {
  if (!spine || spine.centers.length === 0) return null;
  const start = spine.top + 6;
  const end = Math.max(...spine.centers) + 22;
  const to = target === null ? null : spine.centers[target];
  // Before it settles (and with no target), the banner waits under the crest.
  const y = settled && to !== undefined && to !== null ? to : start;
  return (
    <>
      <span
        aria-hidden
        className="pointer-events-none absolute w-px origin-top animate-spine-draw bg-foreground/15 motion-reduce:animate-none"
        style={{ left: spine.x - 0.5, top: start, height: Math.max(0, end - start) }}
      />
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute top-0 h-7 w-2.5 rounded-[2px] transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none",
          // Blue, white, red, white, blue: the band of the Hechter shirt.
          "[background:linear-gradient(90deg,var(--color-psg-blue)_0_26%,#fff_26%_36%,var(--color-psg-red)_36%_64%,#fff_64%_74%,var(--color-psg-blue)_74%)]",
          // A hairline keeps the white stripes and blue edges visible on both themes.
          "shadow-[0_0_0_0.5px_rgb(0_0_0/0.12)] dark:shadow-[0_0_0_0.5px_rgb(255_255_255/0.35)]",
        )}
        style={{
          left: spine.x - 5,
          transform: `translateY(${y - 14}px) scaleY(${settled && to != null ? 1 : 0.4})`,
          opacity: settled && to != null ? 1 : 0,
        }}
      />
    </>
  );
}

const tile =
  "flex h-11 items-center gap-2 rounded-[10px] border bg-card px-3 text-[13px] font-medium transition-[border-color,transform] hover:border-foreground/30 active:scale-[0.97] [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground";

/** Signed-in member with their status and shortcuts, or an invitation to join. */
function AccountBlock({ access, motionIndex }: { access: EventAccess | null; motionIndex: number }) {
  const t = useTranslations("Nav");
  const tMember = useTranslations("MemberArea");
  const pathname = usePathname();
  const { data, isPending } = useSession();
  const handleSignOut = useSignOut();
  const motion = enter(motionIndex);

  if (isPending) return <span aria-hidden className="skeleton block h-[124px] rounded-[12px]" />;

  if (!data) {
    if (pathname.startsWith("/connexion")) return null;
    return (
      <div className={cn(motion.className, "space-y-3 rounded-[12px] border bg-card p-4")} style={motion.style}>
        <div className="space-y-1">
          <p className="font-narrow text-2xl leading-none font-extrabold uppercase italic">{t("drawer.joinTitle")}</p>
          <p className="text-[13px] text-pretty text-muted-foreground">{t("drawer.joinBody")}</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/adhesion"
            prefetch={false}
            className="grid h-10 place-items-center rounded-[8px] bg-segment font-wide text-[11px] font-semibold tracking-[0.06em] text-segment-foreground uppercase shadow-brand transition-opacity hover:opacity-90"
          >
            {t("membership")}
          </Link>
          <Link
            href="/connexion"
            prefetch={false}
            className="grid h-10 place-items-center rounded-[8px] border font-wide text-[11px] font-semibold tracking-[0.06em] uppercase transition-colors hover:bg-foreground/5"
          >
            {t("drawer.signIn")}
          </Link>
        </div>
      </div>
    );
  }

  const { user } = data;
  const status = access && access !== "guest" ? access : null;
  const statusStyle = { full: "text-emerald-600 dark:text-emerald-400", unpaid: "text-amber-600 dark:text-amber-400", pending: "text-muted-foreground" } as const;

  return (
    <div className={cn(motion.className, "space-y-3")} style={motion.style}>
      <div className="flex items-center gap-3">
        <UserAvatar name={user.name} email={user.email} image={user.image} className="size-10 text-[12px]" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold">{user.name || user.email}</span>
          {status ? (
            status === "unpaid" ? (
              <Link href="/cotisation" prefetch={false} className={cn("block truncate text-xs underline-offset-2 hover:underline", statusStyle.unpaid)}>
                {t(`drawer.status.${status}`)}
              </Link>
            ) : (
              <span className={cn("block truncate text-xs", statusStyle[status])}>{t(`drawer.status.${status}`)}</span>
            )
          ) : (
            <span className="block h-4" />
          )}
        </span>
        <button type="button" data-close-menu onClick={handleSignOut} aria-label={tMember("signOut")} title={tMember("signOut")} className="grid size-9 cursor-pointer place-items-center rounded-[8px] text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground">
          <LogOut className="size-4" aria-hidden />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {status !== "pending" ? (
          <Link href="/espace-membre#carte" prefetch={false} className={tile}>
            <QrCode aria-hidden />
            {t("drawer.card")}
          </Link>
        ) : (
          <Link href="/espace-membre" prefetch={false} className={tile}>
            <QrCode aria-hidden />
            {t("memberArea")}
          </Link>
        )}
        <Link href="/matchs/classement" prefetch={false} className={tile}>
          <Target aria-hidden />
          {t("drawer.predictions")}
        </Link>
        <Link href="/parametres" prefetch={false} className={tile}>
          <Settings aria-hidden />
          {t("settings")}
        </Link>
        {hasRole(user.role, "admin") ? (
          <Link href="/admin" prefetch={false} className={tile}>
            <LayoutDashboard aria-hidden />
            {t("drawer.admin")}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

const segment = (active: boolean) =>
  cn(
    "grid h-7 min-w-9 cursor-pointer place-items-center rounded-[6px] px-2 font-wide text-[10px] font-semibold tracking-[0.06em] uppercase transition-colors",
    active ? "bg-segment text-segment-foreground shadow-brand" : "text-muted-foreground hover:text-foreground",
  );

/** Language and theme, as two matching segmented controls. */
function Preferences() {
  const tLocale = useTranslations("LocaleSwitcher");
  const tTheme = useTranslations("Nav.drawer.theme");
  const locale = useLocale();
  const pathname = usePathname();
  // Read once from this device (the menu content mounts when it opens).
  const [theme, setTheme] = useState<ThemePreference>(readThemePreference);
  const themes = [
    { value: "light", icon: Sun },
    { value: "dark", icon: Moon },
    { value: "system", icon: Monitor },
  ] as const;

  return (
    <div className="flex items-center justify-between gap-3">
      <div role="group" aria-label={tLocale("label")} className="flex gap-0.5 rounded-[9px] border bg-card/60 p-0.5">
        {routing.locales.map((code) => (
          <Link
            key={code}
            href={pathname}
            locale={code}
            lang={code}
            title={tLocale(code)}
            aria-current={code === locale ? "true" : undefined}
            className={segment(code === locale)}
          >
            {code}
          </Link>
        ))}
      </div>
      <div role="radiogroup" aria-label={tTheme("label")} className="flex gap-0.5 rounded-[9px] border bg-card/60 p-0.5">
        {themes.map(({ value, icon: Icon }) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={theme === value}
            aria-label={tTheme(value)}
            title={tTheme(value)}
            onClick={() => {
              setThemePreference(value);
              setTheme(value);
            }}
            className={segment(theme === value)}
          >
            <Icon className="size-3.5" aria-hidden />
          </button>
        ))}
      </div>
    </div>
  );
}
