"use client";

import { Search } from "lucide-react";
import { useSelectedLayoutSegment } from "next/navigation";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { useDeferredValue, useMemo, useState } from "react";
import { adminInput } from "@/components/admin/ui/styles";
import { LazyList } from "@/components/lazy-list";
import { PsgBanner } from "@/components/psg-banner";
import { UserAvatar } from "@/components/user-avatar";
import type { ContactStatus, ContactTopic } from "@/db/schema";
import { Link } from "@/i18n/navigation";
import type { InboxRow } from "@/lib/admin/messages-query";
import { cn } from "@/lib/utils";

type Folder = "todo" | "answered" | "closed" | "spam";
const FOLDERS: Folder[] = ["todo", "answered", "closed", "spam"];
const folderOf = (status: ContactStatus): Folder => (status === "new" || status === "open" ? "todo" : status);

const fold = (text: string) => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
const reference = (value: number) => `C-${String(value).padStart(4, "0")}`;

const chip = (on: boolean) =>
  cn(
    "inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-[13px] whitespace-nowrap transition-colors lg:h-8",
    on ? "border-foreground bg-foreground text-background" : "bg-card text-muted-foreground hover:text-foreground",
  );

function Row({ row }: { row: InboxRow }) {
  const t = useTranslations("AdminMessages");
  const tTopics = useTranslations("ContactTopics");
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const segment = useSelectedLayoutSegment();
  const unread = row.status === "new";
  return (
    <Link
      href={`/admin/messages/${row.id}`}
      prefetch={false}
      aria-current={segment === row.id ? "page" : undefined}
      className="group relative flex gap-3 rounded-[12px] border bg-card/70 p-3 transition-[border-color,background-color,transform] hover:border-foreground/30 active:scale-[0.99] aria-[current=page]:border-foreground/40 aria-[current=page]:bg-card"
    >
      <PsgBanner className="absolute top-1/2 -left-[5px] h-7 w-2.5 -translate-y-1/2 scale-y-0 transition-transform duration-300 ease-out group-aria-[current=page]:scale-y-100" />
      <span className="relative">
        <UserAvatar name={row.name} email={row.email} image={row.image} className="size-10 rounded-[10px] text-[11px]" />
        {unread ? <span aria-label={t("unread")} className="absolute -top-1 -right-1 size-3 rounded-full bg-psg-red ring-2 ring-card" /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className={cn("min-w-0 flex-1 truncate text-[15px]", unread ? "font-bold" : "font-semibold")}>{row.organisation ? `${row.name} · ${row.organisation}` : row.name}</span>
          <span suppressHydrationWarning className="shrink-0 text-[12px] text-muted-foreground tabular-nums">{format.relativeTime(row.lastMessageAt, now)}</span>
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <span className="font-mono">{reference(row.reference)}</span>
          <span aria-hidden>·</span>
          <span className="truncate">{tTopics(`${row.topic}.label`)}</span>
          {row.memberId ? <span className="shrink-0 rounded-full bg-psg-blue/10 px-1.5 py-px text-[10px] font-semibold text-psg-blue dark:bg-white/10 dark:text-foreground">{t("member")}</span> : null}
        </span>
        <span className={cn("mt-1 line-clamp-2 text-[13px] leading-snug", unread ? "text-foreground" : "text-muted-foreground")}>{row.preview}</span>
      </span>
    </Link>
  );
}

/** Left column of /admin/messages: folders, topic, "mine", search on name, email, reference and text. */
export function InboxList({ rows, me, topics }: { rows: InboxRow[]; me: string; topics: ContactTopic[] }) {
  const t = useTranslations("AdminMessages");
  const tTopics = useTranslations("ContactTopics");
  const [folder, setFolder] = useState<Folder>("todo");
  const [topic, setTopic] = useState<ContactTopic | "all">("all");
  const [mine, setMine] = useState(false);
  const [query, setQuery] = useState("");
  const search = useDeferredValue(query);
  const counts = useMemo(() => Object.fromEntries(FOLDERS.map((value) => [value, rows.filter((row) => folderOf(row.status) === value).length])) as Record<Folder, number>, [rows]);

  const shown = useMemo(() => {
    const words = fold(search).split(/\s+/).filter(Boolean);
    return rows.filter((row) => {
      if (folderOf(row.status) !== folder) return false;
      if (topic !== "all" && row.topic !== topic) return false;
      if (mine && row.assignedToId !== me) return false;
      if (!words.length) return true;
      const haystack = fold(`${row.name} ${row.email} ${row.organisation ?? ""} ${reference(row.reference)} ${row.preview}`);
      return words.every((word) => haystack.includes(word));
    });
  }, [rows, folder, topic, mine, search, me]);

  return (
    <div className="space-y-3">
      <div role="tablist" aria-label={t("title")} className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:px-0">
        {FOLDERS.map((value) => (
          <button key={value} type="button" role="tab" aria-selected={folder === value} onClick={() => setFolder(value)} className={chip(folder === value)}>
            {t(`folders.${value}`)}
            {counts[value] ? <span className={cn("tabular-nums", folder === value ? "opacity-70" : "opacity-60")}>{counts[value]}</span> : null}
          </button>
        ))}
      </div>
      <label className="relative block">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("search")}
          aria-label={t("search")}
          enterKeyHint="search"
          className={cn(adminInput, "pl-9")}
        />
      </label>
      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:px-0">
        <button type="button" aria-pressed={mine} onClick={() => setMine(!mine)} className={chip(mine)}>
          {t("mine")}
        </button>
        {topics.length > 1 ? (
          <select
            value={topic}
            onChange={(event) => setTopic(event.target.value as ContactTopic | "all")}
            aria-label={t("allTopics")}
            className={cn(chip(topic !== "all"), "appearance-none pr-3.5")}
          >
            <option value="all">{t("allTopics")}</option>
            {topics.map((value) => (
              <option key={value} value={value}>
                {tTopics(`${value}.label`)}
              </option>
            ))}
          </select>
        ) : null}
      </div>
      {shown.length ? (
        <LazyList className="space-y-2" initial={30} step={30} placeholder={<span className="skeleton block h-[92px] rounded-[12px]" />} items={shown.map((row) => <Row key={row.id} row={row} />)} />
      ) : (
        <p className="rounded-[12px] border border-dashed p-8 text-center text-sm text-muted-foreground">{t("empty")}</p>
      )}
    </div>
  );
}
