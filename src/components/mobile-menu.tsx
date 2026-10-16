"use client";

import { ArrowRight, ChevronUp, LayoutDashboard, LogOut, Monitor, Moon, Settings, Sun } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { PsgBanner } from "@/components/psg-banner";
import { Cockade, useNavItems } from "@/components/main-nav";
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
  // Admin, member area and "Adhérer" live in the block at the bottom, not in the list.
  const navItems = useNavItems().filter((item) => item.key !== "memberArea" && item.key !== "membership");

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
  const { data: session, isPending: sessionPending } = useSession();
  const showPreferences = !sessionPending && (!session || hasRole(session.user.role, "superadmin"));
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

        <div ref={header} className="flex items-center justify-between gap-2 px-4 py-[clamp(12px,3vw,16px)]">
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

        {/* Signed in: the member area (and admin area) on its own, above the footer, framed by two cockades as in the desktop bar. */}
        {session ? (
          <div className="grid gap-2 px-4 pb-4">
            {/* Admins: the admin area just above. */}
            {hasRole(session.user.role, "moderator") ? (
              <Link
                href="/admin"
                prefetch={false}
                aria-current={pathname.startsWith("/admin") ? "page" : undefined}
                className="flex h-11 items-center justify-center gap-2.5 rounded-[8px] border bg-card font-wide text-[11px] font-semibold tracking-[0.08em] uppercase transition-[background-color,transform] hover:bg-foreground/5 active:scale-[0.98] aria-[current=page]:text-psg-blue dark:aria-[current=page]:text-foreground"
              >
                <LayoutDashboard className="size-3.5 text-muted-foreground" aria-hidden />
                {t("admin")}
              </Link>
            ) : null}
            <Link
              href="/espace-membre"
              prefetch={false}
              aria-current={pathname.startsWith("/espace-membre") ? "page" : undefined}
              className="flex h-11 items-center justify-center gap-2.5 rounded-[8px] border bg-card font-wide text-[11px] font-semibold tracking-[0.08em] uppercase transition-[background-color,transform] hover:bg-foreground/5 active:scale-[0.98] aria-[current=page]:text-psg-blue dark:aria-[current=page]:text-foreground"
            >
              <Cockade />
              {t("memberArea")}
              <Cockade />
            </Link>
          </div>
        ) : null}

        <Spine spine={spine} settled={settled} target={hovered ?? (activeIndex === -1 ? null : activeIndex)} />

        <div className="space-y-4 border-t px-4 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {/* Language and theme for visitors (members set them in Paramètres; the superadmin keeps
              them to check pages quickly), then the account or the sign-in button, within the thumb's reach. */}
          {showPreferences ? (
            <div className="border-b pb-4">
              <Preferences />
            </div>
          ) : null}
          <AccountBlock motionIndex={navItems.length} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** The PSG banner gliding down from under the crest to the current (or hovered) link. */
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
  const to = target === null ? null : spine.centers[target];
  // Before it settles (and with no target), the banner waits under the crest.
  const y = settled && to !== undefined && to !== null ? to : start;
  return (
    <>
      <PsgBanner
        className="pointer-events-none absolute top-0 h-7 w-2.5 transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
        style={{
          left: spine.x - 5,
          transform: `translateY(${y - 14}px) scaleY(${settled && to != null ? 1 : 0.4})`,
          opacity: settled && to != null ? 1 : 0,
        }}
      />
    </>
  );
}


/** The signed-in account (nav-user), or join / sign-in buttons for visitors. */
function AccountBlock({ motionIndex }: { motionIndex: number }) {
  const t = useTranslations("Nav");
  const pathname = usePathname();
  const { data, isPending } = useSession();
  const handleSignOut = useSignOut();
  const motion = enter(motionIndex);

  if (isPending) return <span aria-hidden className="skeleton block h-[124px] rounded-[12px]" />;

  if (!data) {
    // Visitors: join (the call to action, in PSG blue with the shirt's bands) above sign in. On either page, only the other.
    const join = !pathname.startsWith("/adhesion");
    const signIn = !pathname.startsWith("/connexion");
    return (
      <div className={cn(motion.className, "grid gap-2")} style={motion.style}>
        {join ? (
          <Link
            href="/adhesion"
            prefetch={false}
            className="group relative flex h-11 items-center justify-center gap-2 overflow-hidden rounded-[8px] bg-psg-blue font-wide text-[11px] font-semibold tracking-[0.06em] text-white uppercase shadow-brand transition-[opacity,transform] hover:opacity-90 active:scale-[0.98]"
          >
            {/* The Hechter band on the right: red edged with thin white. */}
            <span aria-hidden className="absolute inset-y-0 right-4 w-3.5 border-x-[3px] border-white bg-psg-red" />
            {t("membership")}
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
        ) : null}
        {signIn ? (
          <Link
            href="/connexion"
            prefetch={false}
            className="flex h-11 items-center justify-center rounded-[8px] border bg-card font-wide text-[11px] font-semibold tracking-[0.06em] uppercase transition-[background-color,transform] hover:bg-foreground/5 active:scale-[0.98]"
          >
            {t("drawer.signIn")}
          </Link>
        ) : null}
      </div>
    );
  }

  const { user } = data;
  return (
    <div className={motion.className} style={motion.style}>
      <NavUser user={user} onSignOut={handleSignOut} />
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

const navUserItem =
  "flex h-10 w-full cursor-pointer items-center gap-2.5 rounded-[8px] px-2.5 text-[14px] transition-colors hover:bg-foreground/5 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground";

/**
 * The signed-in account, shadcn "nav-user" style: avatar, name and email on one row with a
 * caret; tapping it unfolds the account links above (accordion, upwards).
 */
function NavUser({
  user,
  onSignOut,
}: {
  user: { name: string; email: string; image?: string | null };
  onSignOut: () => void;
}) {
  const t = useTranslations("Nav");
  const tMember = useTranslations("MemberArea");
  const [open, setOpen] = useState(false);
  const panel = useId();

  return (
    <div className="flex flex-col">
      <div
        id={panel}
        data-open={open || undefined}
        className="grid grid-rows-[0fr] opacity-0 transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] data-[open]:grid-rows-[1fr] data-[open]:opacity-100 motion-reduce:transition-none"
      >
        <div className="min-h-0 overflow-hidden" inert={!open}>
          <div className="mb-2 flex flex-col gap-0.5 border-b pb-2">
            <Link href="/parametres" prefetch={false} className={navUserItem}>
              <Settings aria-hidden />
              {t("settings")}
            </Link>
            <button type="button" data-close-menu onClick={onSignOut} className={navUserItem}>
              <LogOut aria-hidden />
              {tMember("signOut")}
            </button>
          </div>
        </div>
      </div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panel}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full cursor-pointer items-center gap-3 rounded-[10px] p-2 text-left transition-colors hover:bg-foreground/5 aria-expanded:bg-foreground/5"
      >
        <UserAvatar name={user.name} email={user.email} image={user.image} className="size-9 rounded-[8px] text-[11px]" />
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-[14px] font-semibold">{user.name || user.email}</span>
          <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
        </span>
        <ChevronUp
          className={cn("size-4 shrink-0 text-muted-foreground transition-transform duration-300 ease-out", open && "rotate-180")}
          aria-hidden
        />
      </button>
    </div>
  );
}
