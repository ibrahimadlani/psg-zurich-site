"use client";

import { ImageOff, Plus, Search } from "lucide-react";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { useDeferredValue, useMemo, useState } from "react";
import { StatusPill, type PillTone } from "@/components/admin/ui/status-pill";
import { adminInput } from "@/components/admin/ui/styles";
import { LOCALES, type Locale, type PostCategory } from "@/db/schema";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export type PostRow = {
  id: string;
  title: string;
  locale: Locale;
  category: PostCategory;
  state: "draft" | "scheduled" | "published";
  publishedAt: Date | null;
  updatedAt: Date;
  imageUrl: string | null;
};
/** An article and its translations (same translation group). */
export type PostGroup = { id: string; original: PostRow; versions: Partial<Record<Locale, PostRow>> };

type Filter = "all" | "draft" | "scheduled" | "published" | "missing";
const FILTERS: Filter[] = ["all", "draft", "scheduled", "published", "missing"];
const fold = (text: string) => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
const stateTone: Record<PostRow["state"], PillTone> = { draft: "neutral", scheduled: "warn", published: "ok" };

const chip = (on: boolean) =>
  cn(
    "inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-[13px] whitespace-nowrap transition-colors lg:h-8",
    on ? "border-foreground bg-foreground text-background" : "bg-card text-muted-foreground hover:text-foreground",
  );

/** FR · DE · EN: each version's state, or "+" to write the missing translation. */
function LanguagePills({ group }: { group: PostGroup }) {
  const t = useTranslations("Cms");
  return (
    <span className="flex gap-1">
      {LOCALES.map((locale) => {
        const version = group.versions[locale];
        if (!version) {
          return (
            <Link
              key={locale}
              href={`/admin/actualites/nouveau?traduction=${group.id}&langue=${locale}`}
              prefetch={false}
              title={t("translateTo", { language: t(`languages.${locale}`) })}
              className="inline-flex h-7 min-w-11 items-center justify-center gap-0.5 rounded-full border border-dashed px-2 font-wide text-[9.5px] font-semibold tracking-[0.06em] text-muted-foreground uppercase transition-colors hover:border-foreground hover:text-foreground"
            >
              <Plus className="size-3" aria-hidden />
              {locale}
            </Link>
          );
        }
        return (
          <Link
            key={locale}
            href={`/admin/actualites/${version.id}`}
            prefetch={false}
            title={`${t(`languages.${locale}`)} · ${t(`states.${version.state}`)}`}
            className={cn(
              "inline-flex h-7 min-w-11 items-center justify-center rounded-full px-2 font-wide text-[9.5px] font-semibold tracking-[0.06em] uppercase transition-opacity hover:opacity-80",
              version.state === "published"
                ? "bg-emerald-600/12 text-emerald-700 dark:text-emerald-400"
                : version.state === "scheduled"
                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                  : "bg-foreground/[0.07] text-muted-foreground",
            )}
          >
            {locale}
          </Link>
        );
      })}
    </span>
  );
}

/**
 * The articles, one row per article with its three languages side by side: filter by state or by
 * a missing translation, search by title, open any version in one tap.
 */
export function PostsList({ groups }: { groups: PostGroup[] }) {
  const t = useTranslations("Cms");
  const tNews = useTranslations("News");
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const search = useDeferredValue(query);

  const counts = useMemo(() => {
    const result = { all: groups.length, draft: 0, scheduled: 0, published: 0, missing: 0 } as Record<Filter, number>;
    for (const group of groups) {
      const states = new Set(Object.values(group.versions).map((version) => version!.state));
      for (const state of states) result[state] += 1;
      if (Object.keys(group.versions).length < LOCALES.length) result.missing += 1;
    }
    return result;
  }, [groups]);

  const shown = useMemo(() => {
    const words = fold(search).split(/\s+/).filter(Boolean);
    return groups.filter((group) => {
      const versions = Object.values(group.versions) as PostRow[];
      if (filter === "missing" && versions.length >= LOCALES.length) return false;
      if (filter !== "all" && filter !== "missing" && !versions.some((version) => version.state === filter)) return false;
      const haystack = fold(versions.map((version) => version.title).join(" "));
      return words.every((word) => haystack.includes(word));
    });
  }, [groups, filter, search]);

  return (
    <div className="space-y-3">
      <div role="tablist" aria-label={t("filtersLabel")} className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
        {FILTERS.map((value) => (
          <button key={value} type="button" role="tab" aria-selected={filter === value} onClick={() => setFilter(value)} className={chip(filter === value)}>
            {t(`filters.${value}`)}
            <span className="tabular-nums opacity-60">{counts[value]}</span>
          </button>
        ))}
      </div>
      <label className="relative block">
        <span className="sr-only">{t("search")}</span>
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("search")} className={cn(adminInput, "pl-9")} />
      </label>

      {shown.length ? (
        <ul className="divide-y overflow-hidden rounded-[14px] border bg-card">
          {shown.map((group) => {
            const post = group.original;
            const when =
              post.state === "scheduled" && post.publishedAt
                ? t("scheduledFor", { date: format.dateTime(post.publishedAt, { dateStyle: "medium", timeStyle: "short" }) })
                : t("updated", { date: format.relativeTime(post.updatedAt, now) });
            return (
              <li key={group.id} className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center">
                <Link href={`/admin/actualites/${post.id}`} prefetch={false} className="group flex min-w-0 flex-1 items-center gap-3.5">
                  {post.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- uploaded media
                    <img src={post.imageUrl} alt="" loading="lazy" className="aspect-[4/3] w-16 shrink-0 rounded-[8px] object-cover" />
                  ) : (
                    <span className="grid aspect-[4/3] w-16 shrink-0 place-items-center rounded-[8px] bg-diagonal text-muted-foreground">
                      <ImageOff className="size-4" aria-hidden />
                    </span>
                  )}
                  <span className="min-w-0 flex-1 space-y-1">
                    <span className="block font-wide text-[10px] font-semibold tracking-[0.08em] text-psg-red uppercase">{tNews(`categories.${post.category}`)}</span>
                    <span className="block text-[15px] leading-snug font-semibold text-pretty group-hover:underline">{post.title || t("untitled")}</span>
                    <span className="flex flex-wrap items-center gap-1.5 text-[12px] text-muted-foreground">
                      <StatusPill tone={stateTone[post.state]}>{t(`states.${post.state}`)}</StatusPill>
                      {when}
                    </span>
                  </span>
                </Link>
                <LanguagePills group={group} />
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-[14px] border border-dashed p-8 text-center text-sm text-muted-foreground">{t(groups.length ? "noMatch" : "empty")}</p>
      )}
    </div>
  );
}
