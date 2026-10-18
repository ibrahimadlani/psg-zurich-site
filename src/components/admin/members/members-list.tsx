"use client";

import { Download, Search, SlidersHorizontal, X } from "lucide-react";
import { useSelectedLayoutSegment } from "next/navigation";
import { useTranslations } from "next-intl";
import { useDeferredValue, useMemo, useState } from "react";
import { notify } from "@/lib/notify";
import { StatusPill } from "@/components/admin/ui/status-pill";
import { adminButton, adminInput } from "@/components/admin/ui/styles";
import { LazyList } from "@/components/lazy-list";
import { PsgBanner } from "@/components/psg-banner";
import { UserAvatar } from "@/components/user-avatar";
import { MEMBER_INTERESTS, PSG_TICKETING } from "@/db/schema";
import { Link } from "@/i18n/navigation";
import type { MemberRow } from "@/lib/admin/members-query";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

type Tab = "requests" | "members" | "others";
type Flag = "unpaid" | "paid" | "junior" | "noPhotos" | "unverified";

const tabOf = (row: MemberRow): Tab => (row.status === "pending" ? "requests" : row.status === "active" ? "members" : "others");

/** Lower-case, no accents: « Müller » is found with « muller ». */
const fold = (text: string) => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

const FLAGS: Record<Tab, Flag[]> = {
  requests: ["unverified", "junior", "noPhotos"],
  members: ["unpaid", "paid", "junior", "noPhotos"],
  others: [],
};

const matchesFlag = (row: MemberRow, flag: Flag) =>
  flag === "unpaid" ? !row.paid : flag === "paid" ? row.paid : flag === "junior" ? row.junior : flag === "noPhotos" ? row.photoConsent !== true : !row.emailVerified;

const chip = (on: boolean) =>
  cn(
    "inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-[13px] whitespace-nowrap transition-colors lg:h-8",
    on ? "border-foreground bg-foreground text-background" : "bg-card text-muted-foreground hover:text-foreground",
  );

/** Status of a row, in one pill. */
function RowStatus({ row }: { row: MemberRow }) {
  const t = useTranslations("AdminMembers");
  if (row.status === "pending") {
    return row.emailVerified ? <StatusPill tone="warn">{t("pills.toReview")}</StatusPill> : <StatusPill>{t("pills.unverified")}</StatusPill>;
  }
  if (row.status === "active") return row.paid ? <StatusPill tone="ok">{t("pills.paid")}</StatusPill> : <StatusPill tone="danger">{t("pills.unpaid")}</StatusPill>;
  return <StatusPill>{t(`statuses.${row.status}`)}</StatusPill>;
}

function MemberRowLink({ row }: { row: MemberRow }) {
  const segment = useSelectedLayoutSegment();
  const selected = segment === row.id;
  const name = `${row.firstName} ${row.lastName}`.trim();
  const sub = row.status === "pending" ? row.email : [row.memberNumber, row.city].filter(Boolean).join(" · ") || row.email;
  return (
    <Link
      href={`/admin/members/${row.id}`}
      prefetch={false}
      aria-current={selected ? "page" : undefined}
      className="group relative flex items-center gap-3 rounded-[12px] border bg-card/70 p-3 transition-[border-color,background-color,transform] hover:border-foreground/30 active:scale-[0.99] aria-[current=page]:border-foreground/40 aria-[current=page]:bg-card"
    >
      <PsgBanner className="absolute top-1/2 -left-[5px] h-7 w-2.5 -translate-y-1/2 scale-y-0 transition-transform duration-300 ease-out group-aria-[current=page]:scale-y-100" />
      <UserAvatar name={name} email={row.email} image={row.image} className="size-10 rounded-[10px] text-[11px]" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold">{name || row.email}</span>
        <span className="block truncate text-[13px] text-muted-foreground">{sub}</span>
      </span>
      <RowStatus row={row} />
    </Link>
  );
}

/**
 * The left column of /admin/members: requests, members and the rest in tabs, a search on name,
 * email and number, quick filters, and the CSV export of what is shown (admins).
 */
export function MembersList({ rows, canExport }: { rows: MemberRow[]; canExport: boolean }) {
  const t = useTranslations("AdminMembers");
  const tProfile = useTranslations("MemberProfile");
  const counts = useMemo(() => ({ requests: rows.filter((row) => tabOf(row) === "requests").length, members: rows.filter((row) => tabOf(row) === "members").length, others: rows.filter((row) => tabOf(row) === "others").length }), [rows]);
  // Opens on the requests when one is ready to decide (email confirmed), else on the members.
  const [tab, setTab] = useState<Tab>(() => (rows.some((row) => row.status === "pending" && row.emailVerified) ? "requests" : "members"));
  const [query, setQuery] = useState("");
  const [flags, setFlags] = useState<Flag[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [ticketing, setTicketing] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const [exporting, setExporting] = useState(false);
  const search = useDeferredValue(query);

  const shown = useMemo(() => {
    const words = fold(search).split(/\s+/).filter(Boolean);
    return rows.filter((row) => {
      if (tabOf(row) !== tab) return false;
      if (!flags.every((flag) => matchesFlag(row, flag))) return false;
      if (interests.length && !interests.every((interest) => row.interests.includes(interest as never))) return false;
      if (ticketing && row.psgTicketing !== ticketing) return false;
      if (!words.length) return true;
      const haystack = fold(`${row.firstName} ${row.lastName} ${row.email} ${row.memberNumber ?? ""} ${row.city ?? ""}`);
      return words.every((word) => haystack.includes(word));
    });
  }, [rows, tab, flags, interests, ticketing, search]);

  const toggleFlag = (flag: Flag) =>
    setFlags((current) =>
      current.includes(flag)
        ? current.filter((value) => value !== flag)
        : // "paid" and "unpaid" exclude each other.
          [...current.filter((value) => !(flag === "paid" && value === "unpaid") && !(flag === "unpaid" && value === "paid")), flag],
    );
  const switchTab = (next: Tab) => {
    setTab(next);
    setFlags([]);
    setInterests([]);
    setTicketing(null);
  };
  const filtered = flags.length > 0 || interests.length > 0 || ticketing !== null || search.trim() !== "";

  const exportCsv = async () => {
    setExporting(true);
    try {
      const response = await fetch("/api/v1/members/export", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids: shown.map((row) => row.id) }),
      });
      if (!response.ok) throw new Error();
      const url = URL.createObjectURL(await response.blob());
      const link = Object.assign(document.createElement("a"), { href: url, download: "membres-psg-zurich.csv" });
      link.click();
      URL.revokeObjectURL(url);
      notify.success(t("exported", { count: shown.length }));
    } catch {
      notify.error(t("error"));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div role="tablist" aria-label={t("tabsLabel")} className="flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
        {(["requests", "members", "others"] as const).map((value) => (
          <button key={value} type="button" role="tab" aria-selected={tab === value} onClick={() => switchTab(value)} className={chip(tab === value)}>
            {t(`tabs.${value}`)}
            <span className={cn("tabular-nums", tab === value ? "opacity-70" : "opacity-60")}>{counts[value]}</span>
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">{t("search")}</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("search")} className={cn(adminInput, "pl-9")} />
        </label>
        {tab === "members" ? (
          <button type="button" aria-expanded={more} onClick={() => setMore((value) => !value)} className={adminButton(more || interests.length || ticketing ? "primary" : "secondary", "icon")} title={t("moreFilters")}>
            <SlidersHorizontal aria-hidden />
            <span className="sr-only">{t("moreFilters")}</span>
          </button>
        ) : null}
        {canExport && tab !== "requests" ? (
          <button type="button" onClick={exportCsv} disabled={exporting || shown.length === 0} className={adminButton("secondary", "icon")} title={t("export")}>
            <Download aria-hidden />
            <span className="sr-only">{t("export")}</span>
          </button>
        ) : null}
      </div>

      {FLAGS[tab].length ? (
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none]">
          {FLAGS[tab].map((flag) => (
            <button key={flag} type="button" aria-pressed={flags.includes(flag)} onClick={() => toggleFlag(flag)} className={chip(flags.includes(flag))}>
              {t(`flags.${flag}`)}
            </button>
          ))}
        </div>
      ) : null}

      {/* Interests and PSG ticketing, folded away (the less used filters). */}
      <div data-open={(more && tab === "members") || undefined} className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] data-[open]:grid-rows-[1fr]">
        <div className="min-h-0 overflow-hidden" inert={!(more && tab === "members")}>
          <div className="space-y-3 rounded-[12px] border bg-card/70 p-3">
            <div className="flex flex-wrap gap-1.5">
              {MEMBER_INTERESTS.map((interest) => (
                <button
                  key={interest}
                  type="button"
                  aria-pressed={interests.includes(interest)}
                  onClick={() => setInterests((current) => (current.includes(interest) ? current.filter((value) => value !== interest) : [...current, interest]))}
                  className={chip(interests.includes(interest))}
                >
                  {tProfile(`interests.${interest}`)}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5 border-t pt-3">
              {PSG_TICKETING.map((value) => (
                <button key={value} type="button" aria-pressed={ticketing === value} onClick={() => setTicketing((current) => (current === value ? null : value))} className={chip(ticketing === value)}>
                  {tProfile(`ticketing.${value}.label`)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 px-1 text-[12px] text-muted-foreground">
        <span aria-live="polite">{t("shown", { count: shown.length })}</span>
        {filtered ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setFlags([]);
              setInterests([]);
              setTicketing(null);
            }}
            className="inline-flex cursor-pointer items-center gap-1 hover:text-foreground"
          >
            <X className="size-3" aria-hidden />
            {t("clear")}
          </button>
        ) : null}
      </div>

      {shown.length ? (
        <LazyList
          className="space-y-2"
          initial={30}
          step={30}
          placeholder={<Skeleton className="h-[66px] rounded-[12px]" />}
          items={shown.map((row) => (
            <MemberRowLink key={row.id} row={row} />
          ))}
        />
      ) : (
        <p className="rounded-[12px] border border-dashed p-6 text-center text-sm text-muted-foreground">{t(filtered ? "noMatch" : `empty.${tab}`)}</p>
      )}
    </div>
  );
}
