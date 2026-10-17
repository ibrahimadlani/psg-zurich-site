"use client";

import { BadgeCheck, Bell, CalendarDays, Inbox, MessageSquareReply, Newspaper, Target, Trophy, X, type LucideIcon } from "lucide-react";
import { useFormatter, useLocale, useNow, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { headerIconButtonClass } from "@/components/header-icon-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { Link, usePathname } from "@/i18n/navigation";
import type { NotificationItem } from "@/lib/notification-feed";
import { cn } from "@/lib/utils";

type Item = NotificationItem & { unread: boolean };
type Feed = { items: Item[]; unread: number };

const ICONS: Record<Item["kind"], LucideIcon> = {
  article: Newspaper,
  event: CalendarDays,
  prediction: Target,
  points: Trophy,
  membership: BadgeCheck,
  contactInbox: Inbox,
  contactReply: MessageSquareReply,
};

/** Bell of the header for signed-in members: unread badge, latest news of the club in a menu. */
export function NotificationBell() {
  const t = useTranslations("Notifications");
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const locale = useLocale();
  const pathname = usePathname();
  const [feed, setFeed] = useState<Feed | null>(null);

  // On every page change, so a new article or event shows up without a reload.
  useEffect(() => {
    let stale = false;
    fetch(`/api/v1/me/notifications?locale=${locale}`, { cache: "no-store" })
      .then((response) => (response.ok ? (response.json() as Promise<{ data: Feed }>) : null))
      .then((body) => {
        if (body && !stale) setFeed(body.data);
      })
      .catch(() => {
        // Offline: keep what is shown.
      });
    return () => {
      stale = true;
    };
  }, [locale, pathname]);

  function onOpenChange(open: boolean) {
    if (!open || !feed?.unread) return;
    // Items stay highlighted while the menu is open; the badge goes away at once.
    setFeed({ ...feed, unread: 0 });
    void fetch("/api/v1/me/notifications", { method: "POST" }).catch(() => {});
  }

  const unread = feed?.unread ?? 0;

  // Cleaning the list: gone at once, saved in the background (kept for good on the server).
  function clearAll() {
    setFeed({ items: [], unread: 0 });
    void fetch("/api/v1/me/notifications", { method: "DELETE" }).catch(() => {});
  }
  function dismiss(item: Item) {
    if (!feed) return;
    const items = feed.items.filter((other) => other.id !== item.id);
    setFeed({ items, unread: Math.max(0, feed.unread - (item.unread ? 1 : 0)) });
    void fetch(`/api/v1/me/notifications?id=${encodeURIComponent(item.id)}`, { method: "DELETE" }).catch(() => {});
  }

  function text(item: Item) {
    switch (item.kind) {
      case "article":
      case "event":
        return { label: t(`kinds.${item.kind}`), body: item.title };
      case "prediction":
        return { label: t("kinds.prediction"), body: t("predictionBody", { opponent: item.opponent }) };
      case "points":
        return { label: t("kinds.points"), body: t("pointsBody", { count: item.points, opponent: item.opponent }) };
      case "membership":
        return { label: t("kinds.membership"), body: t("membershipBody") };
      case "contactInbox":
        return { label: t("kinds.contactInbox"), body: t("contactInboxBody", { count: item.count }) };
      case "contactReply":
        return { label: t("kinds.contactReply"), body: t("contactReplyBody", { reference: item.reference }) };
    }
  }

  return (
    <DropdownMenu modal={false} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger
        aria-label={unread ? t("labelUnread", { count: unread }) : t("label")}
        title={t("label")}
        className={cn(headerIconButtonClass, "relative")}
      >
        <Bell className="size-3.5" aria-hidden />
        {unread ? (
          <span
            aria-hidden
            className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 animate-in place-items-center rounded-full bg-psg-red px-1 text-[9px] leading-none font-bold text-white tabular-nums ring-2 ring-background zoom-in-50 duration-300"
          >
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6} className="w-[min(22rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between gap-2 pr-1.5">
          <DropdownMenuLabel className="px-4 pt-3 pb-2 font-wide text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
            {t("label")}
          </DropdownMenuLabel>
          {feed?.items.length ? (
            // A menu item (reachable with the arrow keys) that keeps the menu open.
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                clearAll();
              }}
              className="mt-1.5 h-7 rounded-md px-2 text-[12px] text-muted-foreground"
            >
              {t("clearAll")}
            </DropdownMenuItem>
          ) : null}
        </div>
        {feed && feed.items.length > 0 ? (
          <div className="max-h-[min(26rem,70vh)] overflow-y-auto px-1.5 pb-1.5">
            {feed.items.map((item) => {
              const Icon = ICONS[item.kind];
              const { label, body } = text(item);
              return (
                <div key={item.id} className="group/item relative">
                  <DropdownMenuItem asChild className="items-start gap-3 rounded-lg py-2.5 pr-10 pl-2.5">
                    <Link
                      href={item.href}
                      prefetch={false}
                      aria-keyshortcuts="Delete"
                      // Keyboard: Delete (or Backspace) removes the focused item.
                      onKeyDown={(event) => {
                        if (event.key !== "Delete" && event.key !== "Backspace") return;
                        event.preventDefault();
                        dismiss(item);
                      }}
                    >
                      <span
                        className={cn(
                          "mt-0.5 grid size-8 shrink-0 place-items-center rounded-full",
                          item.unread ? "bg-psg-blue text-white" : "bg-foreground/5 text-muted-foreground",
                        )}
                      >
                        <Icon className="size-3.5" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2 text-[11px] text-muted-foreground">
                          <span className="truncate">{label}</span>
                          <time dateTime={item.at} className="shrink-0">
                            {format.relativeTime(new Date(item.at), now)}
                          </time>
                        </span>
                        <span
                          className={cn(
                            "line-clamp-2 text-[13px] leading-snug",
                            item.unread ? "font-semibold text-foreground" : "text-foreground/80",
                          )}
                        >
                          {body}
                        </span>
                      </span>
                      {item.unread ? <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-psg-red" /> : null}
                    </Link>
                  </DropdownMenuItem>
                  {/* Remove one item: shown on hover with a mouse, always on touch screens. */}
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-label={t("dismiss")}
                    title={t("dismiss")}
                    onClick={() => dismiss(item)}
                    className="absolute top-2 right-1.5 grid size-7 cursor-pointer place-items-center rounded-full text-muted-foreground opacity-0 transition-[opacity,background-color,color] group-hover/item:opacity-100 hover:bg-foreground/10 hover:text-foreground focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
                  >
                    <X className="size-3.5" aria-hidden />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          feed ? (
            <p className="px-4 pt-2 pb-6 text-center text-[13px] text-muted-foreground">{t("empty")}</p>
          ) : (
            <SkeletonGroup label={t("loading")} className="space-y-1 px-2 pb-2">
              {[0, 1, 2].map((index) => (
                <div key={index} className="flex gap-3 px-2 py-2.5">
                  <Skeleton className="size-8 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-2 pt-1">
                    <Skeleton className="h-3 w-1/3 rounded-full" />
                    <Skeleton className="h-3 w-11/12 rounded-full" />
                  </div>
                </div>
              ))}
            </SkeletonGroup>
          )
        )}
        <DropdownMenuSeparator className="my-0" />
        <DropdownMenuItem asChild className="justify-center rounded-none px-4 py-2.5 text-[12px] text-muted-foreground">
          <Link href="/settings/notifications" prefetch={false}>
            {t("manage")}
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
