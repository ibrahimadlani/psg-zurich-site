"use client";

import { CalendarDays, CornerDownLeft, Newspaper, Search } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { Dialog } from "radix-ui";
import { useEffect, useMemo, useState } from "react";
import type { AdminSection } from "@/components/admin/shell/sections";
import { UserAvatar } from "@/components/user-avatar";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type Found = {
  members: { id: string; name: string; memberNumber: string | null; email: string; image: string | null }[];
  events: { id: string; title: string; startsAt: string }[];
  posts: { id: string; title: string; locale: string }[];
};
type Item = { key: string; href: string; group: string; label: string; hint?: string; icon: React.ReactNode };

const fold = (text: string) => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/** Opens the palette from anywhere in the admin: ⌘K / Ctrl+K, or the search buttons. */
export const OPEN_PALETTE = "psgz-admin-palette";

/**
 * Jump anywhere in the admin by typing: the sections, then members, events and articles found
 * on the server (a few of each). Arrows to move, Enter to open, Esc to close.
 */
export function CommandPalette({ sections }: { sections: AdminSection[] }) {
  const t = useTranslations("AdminShell");
  const format = useFormatter();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<Found | null>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_PALETTE, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_PALETTE, onOpen);
    };
  }, []);

  // Server results, a moment after typing stops.
  useEffect(() => {
    const value = query.trim();
    if (value.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetch(`/api/v1/admin/search?q=${encodeURIComponent(value)}`, { signal: controller.signal })
        .then((response) => (response.ok ? (response.json() as Promise<{ data: Found }>) : null))
        .then((body) => {
          if (body) {
            setFound(body.data);
            setActive(0);
          }
        })
        .catch(() => {});
    }, 180);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const items = useMemo<Item[]>(() => {
    const words = fold(query).split(/\s+/).filter(Boolean);
    const list: Item[] = sections
      .filter((section) => words.every((word) => fold(t(`sections.${section.key}`)).includes(word)))
      .map((section) => {
        const Icon = section.icon;
        return { key: `s-${section.key}`, href: section.href, group: t("palette.sections"), label: t(`sections.${section.key}`), icon: <Icon className="size-4" aria-hidden /> };
      });
    if (query.trim().length >= 2 && found) {
      for (const member of found.members) {
        list.push({
          key: `m-${member.id}`,
          href: `/admin/membres/${member.id}`,
          group: t("sections.members"),
          label: member.name || member.email,
          hint: member.memberNumber ?? member.email,
          icon: <UserAvatar name={member.name} email={member.email} image={member.image} className="size-6 rounded-[6px] text-[9px]" />,
        });
      }
      for (const event of found.events) {
        list.push({
          key: `e-${event.id}`,
          href: `/admin/evenements/${event.id}`,
          group: t("sections.events"),
          label: event.title,
          hint: format.dateTime(new Date(event.startsAt), { day: "numeric", month: "short", year: "numeric" }),
          icon: <CalendarDays className="size-4" aria-hidden />,
        });
      }
      for (const post of found.posts) {
        list.push({ key: `p-${post.id}`, href: `/admin/actualites/${post.id}`, group: t("sections.news"), label: post.title, hint: post.locale.toUpperCase(), icon: <Newspaper className="size-4" aria-hidden /> });
      }
    }
    return list;
  }, [sections, query, found, t, format]);

  const go = (item: Item | undefined) => {
    if (!item) return;
    setOpen(false);
    router.push(item.href);
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setQuery("");
          setFound(null);
          setActive(0);
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[3px] data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-x-3 top-[max(1rem,env(safe-area-inset-top))] z-50 flex max-h-[min(32rem,80svh)] flex-col overflow-hidden rounded-[16px] border bg-popover shadow-2xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-2 sm:inset-x-auto sm:top-[12svh] sm:left-1/2 sm:w-[min(36rem,calc(100vw-2rem))] sm:-translate-x-1/2"
        >
          <Dialog.Title className="sr-only">{t("palette.title")}</Dialog.Title>
          <div className="flex items-center gap-2.5 border-b px-4">
            <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <input
              autoFocus
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(0);
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setActive((index) => Math.min(items.length - 1, index + 1));
                } else if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setActive((index) => Math.max(0, index - 1));
                } else if (event.key === "Enter") {
                  event.preventDefault();
                  go(items[active]);
                }
              }}
              placeholder={t("palette.placeholder")}
              role="combobox"
              aria-expanded
              aria-controls="admin-palette-list"
              aria-activedescendant={items[active] ? `palette-${items[active].key}` : undefined}
              className="h-14 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
            />
            <kbd className="hidden rounded-[5px] border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">Esc</kbd>
          </div>
          <ul id="admin-palette-list" role="listbox" className="flex-1 overflow-y-auto p-2">
            {items.length ? (
              items.map((item, index) => (
                <li key={item.key} id={`palette-${item.key}`} role="option" aria-selected={index === active}>
                  {index === 0 || items[index - 1]!.group !== item.group ? (
                    <p className="px-2.5 pt-2 pb-1 font-wide text-[9px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">{item.group}</p>
                  ) : null}
                  <button
                    type="button"
                    onMouseMove={() => setActive(index)}
                    onClick={() => go(item)}
                    className={cn(
                      "flex w-full cursor-pointer items-center gap-3 rounded-[8px] px-2.5 py-2 text-left text-[14px]",
                      index === active ? "bg-foreground/[0.06]" : "",
                    )}
                  >
                    <span className="grid size-6 shrink-0 place-items-center text-muted-foreground">{item.icon}</span>
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {item.hint ? <span className="shrink-0 text-[12px] text-muted-foreground">{item.hint}</span> : null}
                    {index === active ? <CornerDownLeft className="size-3.5 shrink-0 text-muted-foreground" aria-hidden /> : null}
                  </button>
                </li>
              ))
            ) : (
              <li className="px-3 py-8 text-center text-sm text-muted-foreground">{t("palette.empty")}</li>
            )}
          </ul>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
