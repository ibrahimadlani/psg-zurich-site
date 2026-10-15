"use client";

import { ArrowUpRight, Ellipsis, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { ConfirmProvider } from "@/components/admin/ui/confirm-dialog";
import { ADMIN_GROUPS, ADMIN_SECTIONS, activeSection, type AdminBadge, type AdminSection } from "@/components/admin/shell/sections";
import { BrandLogo } from "@/components/brand-logo";
import { PsgBanner } from "@/components/psg-banner";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { UserAvatar } from "@/components/user-avatar";
import { Link, usePathname } from "@/i18n/navigation";
import { useSession } from "@/lib/auth-client";
import { can } from "@/lib/roles";
import { cn } from "@/lib/utils";

type Counters = Record<AdminBadge, number>;

/* ------------------------------ Collapsed rail ----------------------------- */

// The sidebar's state on a computer: "auto" (rail on a laptop, full on a wide screen) until the
// admin picks one; remembered on this device.
const RAIL_KEY = "psgz-admin-rail";
type RailState = "auto" | "collapsed" | "expanded";
const railListeners = new Set<() => void>();
function readRail(): RailState {
  try {
    const value = localStorage.getItem(RAIL_KEY);
    return value === "collapsed" || value === "expanded" ? value : "auto";
  } catch {
    return "auto";
  }
}
function writeRail(value: RailState) {
  try {
    localStorage.setItem(RAIL_KEY, value);
  } catch {
    // Private mode: the choice lasts until the page reloads.
  }
  railListeners.forEach((listener) => listener());
}
const subscribeRail = (listener: () => void) => {
  railListeners.add(listener);
  return () => railListeners.delete(listener);
};

// Shown only when the sidebar is open (explicitly, or "auto" on a wide screen).
const whenOpen = "hidden group-data-[state=expanded]/side:block xl:group-data-[state=auto]/side:block";
const whenOpenFlex = "hidden group-data-[state=expanded]/side:flex xl:group-data-[state=auto]/side:flex";
const whenRail = "group-data-[state=expanded]/side:hidden xl:group-data-[state=auto]/side:hidden";

/* --------------------------------- Counters -------------------------------- */

/** Badge numbers, read again on each section change (cheap: three counts). */
function useCounters(pathname: string) {
  const [counters, setCounters] = useState<Counters | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/v1/admin/summary")
      .then((response) => (response.ok ? (response.json() as Promise<{ data: Counters }>) : null))
      .then((body) => {
        if (!cancelled && body) setCounters(body.data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pathname]);
  return counters;
}

function CountBadge({ value, className }: { value: number | undefined; className?: string }) {
  if (!value) return null;
  return (
    <span
      className={cn(
        "grid h-[18px] min-w-[18px] place-items-center rounded-full bg-psg-red px-1 text-[10px] leading-none font-semibold text-white tabular-nums",
        className,
      )}
    >
      {value > 99 ? "99+" : value}
    </span>
  );
}

/* --------------------------------- Sidebar --------------------------------- */

function Sidebar({ sections, active, counters }: { sections: AdminSection[]; active: AdminSection | undefined; counters: Counters | null }) {
  const t = useTranslations("AdminShell");
  const rail = useSyncExternalStore(subscribeRail, readRail, () => "auto" as RailState);
  const { data } = useSession();
  const nav = useRef<HTMLElement>(null);
  const [marker, setMarker] = useState<number | null>(null);

  // The PSG banner slides to the active section (as in the phone menu).
  useLayoutEffect(() => {
    const element = nav.current;
    if (!element) return;
    const place = () => {
      const link = element.querySelector<HTMLElement>('a[aria-current="page"]');
      setMarker(link ? link.offsetTop + link.offsetHeight / 2 : null);
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(element);
    return () => observer.disconnect();
  }, [active?.key, sections.length]);

  const toggle = () => {
    const open = rail === "expanded" || (rail === "auto" && window.matchMedia("(min-width: 80rem)").matches);
    writeRail(open ? "collapsed" : "expanded");
  };

  return (
    <aside
      data-state={rail}
      className="group/side sticky top-0 hidden h-svh w-16 shrink-0 flex-col border-r bg-background/80 backdrop-blur-md transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] data-[state=expanded]:w-60 lg:flex xl:data-[state=auto]:w-60"
    >
      <div className="flex h-16 items-center gap-2 px-3">
        <span className={cn(whenRail, "mx-auto")}>
          <Link href="/admin" aria-label={t("home")}>
            <Image src="/brand/psg-crest.svg" alt="" width={34} height={34} className="block" />
          </Link>
        </span>
        <span className={cn(whenOpenFlex, "min-w-0 flex-1 items-center pl-1")}>
          <BrandLogo />
        </span>
      </div>

      <nav ref={nav} aria-label={t("label")} className="relative flex-1 overflow-y-auto px-3 py-3 [scrollbar-width:thin]">
        {marker !== null ? (
          <PsgBanner
            className="pointer-events-none absolute left-0 h-7 w-2.5 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
            style={{ top: 0, transform: `translateY(${marker - 14}px)` }}
          />
        ) : null}
        {ADMIN_GROUPS.map((group) => {
          const items = sections.filter((section) => section.group === group);
          if (items.length === 0) return null;
          return (
            <div key={group} className="mb-4 last:mb-0">
              <p className={cn(whenOpen, "mb-1.5 px-2.5 font-wide text-[9px] font-semibold tracking-[0.08em] text-muted-foreground/80 uppercase")}>
                {t(`groups.${group}`)}
              </p>
              <ul className="space-y-0.5">
                {items.map((section) => {
                  const current = section.key === active?.key;
                  const Icon = section.icon;
                  const badge = section.badge ? counters?.[section.badge] : undefined;
                  return (
                    <li key={section.key}>
                      <Link
                        href={section.href}
                        prefetch={false}
                        aria-current={current ? "page" : undefined}
                        title={t(`sections.${section.key}`)}
                        className={cn(
                          "relative flex h-10 items-center gap-3 rounded-[8px] px-2.5 transition-colors",
                          current ? "bg-foreground/[0.06] text-foreground" : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground",
                        )}
                      >
                        <Icon className="size-[18px] shrink-0" aria-hidden />
                        <span className={cn(whenOpen, "min-w-0 flex-1 truncate font-wide text-[10px] font-semibold tracking-[0.08em] uppercase")}>
                          {t(`sections.${section.key}`)}
                        </span>
                        <CountBadge value={badge} className={whenOpenFlex} />
                        {/* On the rail: a dot on the icon. */}
                        {badge ? <span className={cn(whenRail, "absolute top-2 right-2 size-2 rounded-full bg-psg-red")} /> : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="space-y-1 border-t px-3 py-3">
        <Link
          href="/"
          title={t("site")}
          className="flex h-9 items-center gap-3 rounded-[8px] px-2.5 text-muted-foreground transition-colors hover:bg-foreground/[0.04] hover:text-foreground"
        >
          <ArrowUpRight className="size-[18px] shrink-0" aria-hidden />
          <span className={cn(whenOpen, "font-wide text-[10px] font-semibold tracking-[0.08em] uppercase")}>{t("site")}</span>
        </Link>
        {data ? (
          <div className="flex items-center gap-3 px-1.5 py-1.5">
            <UserAvatar name={data.user.name} email={data.user.email} image={data.user.image} className="size-8 rounded-[8px]" />
            <span className={cn(whenOpen, "min-w-0 flex-1 leading-tight")}>
              <span className="block truncate text-[13px] font-semibold">{data.user.name || data.user.email}</span>
              <span className="block truncate text-[11px] text-muted-foreground">{t(`roles.${data.user.role}`)}</span>
            </span>
          </div>
        ) : null}
        <button
          type="button"
          onClick={toggle}
          title={t("toggle")}
          className="flex h-9 w-full cursor-pointer items-center gap-3 rounded-[8px] px-2.5 text-muted-foreground transition-colors hover:bg-foreground/[0.04] hover:text-foreground"
        >
          <PanelLeftOpen className={cn(whenRail, "size-[18px] shrink-0")} aria-hidden />
          <PanelLeftClose className={cn(whenOpen, "size-[18px] shrink-0")} aria-hidden />
          <span className={cn(whenOpen, "text-[13px]")}>{t("collapse")}</span>
          <span className="sr-only">{t("toggle")}</span>
        </button>
      </div>
    </aside>
  );
}

/* ------------------------------- Phone chrome ------------------------------ */

function TopBar({ active }: { active: AdminSection | undefined }) {
  const t = useTranslations("AdminShell");
  return (
    <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur-md lg:hidden">
      <Link href="/admin" aria-label={t("home")} className="shrink-0">
        <Image src="/brand/psg-crest.svg" alt="" width={30} height={30} className="block" />
      </Link>
      <span className="min-w-0 flex-1 truncate font-wide text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
        {t("badge")}
        {active && active.key !== "home" ? <span className="text-foreground"> · {t(`sections.${active.key}`)}</span> : null}
      </span>
      <Link
        href="/"
        className="inline-flex h-8 items-center gap-1 rounded-[8px] border px-2.5 font-wide text-[9px] font-semibold tracking-[0.08em] uppercase transition-colors hover:bg-foreground/5"
      >
        {t("site")}
        <ArrowUpRight className="size-3" aria-hidden />
      </Link>
    </div>
  );
}

const tabClass =
  "relative flex h-full flex-col items-center justify-center gap-1 font-wide text-[8.5px] font-semibold tracking-[0.06em] uppercase transition-colors";

function TabBar({ sections, active, counters }: { sections: AdminSection[]; active: AdminSection | undefined; counters: Counters | null }) {
  const t = useTranslations("AdminShell");
  const [more, setMore] = useState(false);
  const tabs = sections.filter((section) => section.tab).slice(0, 4);
  const rest = sections.filter((section) => !tabs.includes(section));
  const inRest = rest.some((section) => section.key === active?.key);
  const restBadge = rest.reduce((sum, section) => sum + (section.badge ? (counters?.[section.badge] ?? 0) : 0), 0);

  return (
    <>
      <nav
        aria-label={t("label")}
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
      >
        <ul className="grid h-16 grid-cols-5">
          {tabs.map((section) => {
            const current = section.key === active?.key;
            const Icon = section.icon;
            const badge = section.badge ? counters?.[section.badge] : undefined;
            // The scanner: a round PSG-blue button raised above the bar, the door's one tap.
            if (section.key === "scanner") {
              return (
                <li key={section.key}>
                  <Link href={section.href} prefetch={false} aria-current={current ? "page" : undefined} className={cn(tabClass, current ? "text-foreground" : "text-muted-foreground")}>
                    <span
                      className={cn(
                        "-mt-7 grid size-14 place-items-center rounded-full bg-psg-blue text-white shadow-[0_8px_20px_-6px_rgb(0_65_112/0.7)] ring-4 ring-background transition-transform active:scale-95",
                        current && "bg-psg-red shadow-[0_8px_20px_-6px_rgb(218_41_28/0.6)]",
                      )}
                    >
                      <Icon className="size-6" aria-hidden />
                    </span>
                    {t(`tabs.${section.key}`)}
                  </Link>
                </li>
              );
            }
            return (
              <li key={section.key}>
                <Link
                  href={section.href}
                  prefetch={false}
                  aria-current={current ? "page" : undefined}
                  className={cn(tabClass, current ? "text-foreground" : "text-muted-foreground")}
                >
                  {current ? <PsgBanner className="absolute top-0 h-[3px] w-7 rounded-none rounded-b-[2px]" /> : null}
                  <span className="relative">
                    <Icon className="size-5" aria-hidden />
                    <CountBadge value={badge} className="absolute -top-1.5 -right-3 h-4 min-w-4 text-[9px]" />
                  </span>
                  {t(`tabs.${section.key}`)}
                </Link>
              </li>
            );
          })}
          <li className="col-start-5">
            <button
              type="button"
              onClick={() => setMore(true)}
              aria-expanded={more}
              className={cn(tabClass, "w-full cursor-pointer", inRest ? "text-foreground" : "text-muted-foreground")}
            >
              {inRest ? <PsgBanner className="absolute top-0 h-[3px] w-7 rounded-none rounded-b-[2px]" /> : null}
              <span className="relative">
                <Ellipsis className="size-5" aria-hidden />
                {restBadge ? <span className="absolute -top-0.5 -right-1 size-2 rounded-full bg-psg-red" /> : null}
              </span>
              {t("more")}
            </button>
          </li>
        </ul>
      </nav>

      <Sheet open={more} onOpenChange={setMore}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          aria-describedby={undefined}
          className="gap-0 rounded-t-[18px] px-4 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
          onClick={(event) => {
            if ((event.target as HTMLElement).closest("a")) setMore(false);
          }}
        >
          <span aria-hidden className="mx-auto mb-4 block h-1 w-10 rounded-full bg-foreground/15" />
          <SheetTitle className="mb-3 px-1 font-wide text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
            {t("more")}
          </SheetTitle>
          <ul className="grid grid-cols-2 gap-2">
            {rest.map((section) => {
              const Icon = section.icon;
              const current = section.key === active?.key;
              return (
                <li key={section.key}>
                  <Link
                    href={section.href}
                    prefetch={false}
                    aria-current={current ? "page" : undefined}
                    className="flex h-14 items-center gap-3 rounded-[12px] border bg-card px-3.5 transition-colors hover:bg-foreground/[0.04] aria-[current=page]:border-foreground/40"
                  >
                    <Icon className="size-[18px] shrink-0 text-muted-foreground" aria-hidden />
                    <span className="min-w-0 flex-1 truncate font-wide text-[10px] font-semibold tracking-[0.08em] uppercase">
                      {t(`sections.${section.key}`)}
                    </span>
                    <CountBadge value={section.badge ? counters?.[section.badge] : undefined} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </SheetContent>
      </Sheet>
    </>
  );
}

/* ---------------------------------- Shell ---------------------------------- */

/**
 * The admin's own frame. Computer: a sidebar (a rail of icons on a laptop, foldable). Phone: a
 * slim top bar and a bottom tab bar, the other sections under "Plus". Sections the role may not
 * use are left out (the pages and the API check again).
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data } = useSession();
  const role = data?.user.role;
  // While the session loads, only the home section (never a forbidden one).
  const sections = ADMIN_SECTIONS.filter((section) => (role ? can(role, section.capability) : section.key === "home"));
  const active = activeSection(pathname, sections);
  const counters = useCounters(pathname);

  return (
    <ConfirmProvider>
      <div className="flex min-h-svh flex-1">
        <Sidebar sections={sections} active={active} counters={counters} />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar active={active} />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-10 lg:pt-10 lg:pb-12">
            {children}
          </main>
        </div>
        <TabBar sections={sections} active={active} counters={counters} />
      </div>
    </ConfirmProvider>
  );
}
