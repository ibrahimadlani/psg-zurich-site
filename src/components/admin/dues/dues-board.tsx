"use client";

import { Check, MailWarning, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useDeferredValue, useMemo, useOptimistic, useState, useTransition } from "react";
import { notify } from "@/lib/notify";
import { useConfirm } from "@/components/admin/ui/confirm-dialog";
import { StatusPill } from "@/components/admin/ui/status-pill";
import { adminButton, adminInput } from "@/components/admin/ui/styles";
import { UserAvatar } from "@/components/user-avatar";
import { Link, useRouter } from "@/i18n/navigation";
import type { MemberRow } from "@/lib/admin/members-query";
import { cn } from "@/lib/utils";

type View = "unpaid" | "paid" | "all";
const fold = (text: string) => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

async function post(url: string, body: unknown) {
  const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error();
  return ((await response.json()) as { data: { updated?: number; queued?: number; online?: string[] } }).data;
}

const chip = (on: boolean) =>
  cn(
    "inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-[13px] whitespace-nowrap transition-colors lg:h-8",
    on ? "border-foreground bg-foreground text-background" : "bg-card text-muted-foreground hover:text-foreground",
  );

/**
 * The season's fees: who still owes, ticked one by one or several at once, then "paid" (with
 * an undo) or a reminder email. Rows change at once; the server confirms behind.
 */
export function DuesBoard({ rows }: { rows: MemberRow[] }) {
  const t = useTranslations("AdminDues");
  const router = useRouter();
  const ask = useConfirm();
  const [view, setView] = useState<View>("unpaid");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const [optimistic, setPaid] = useOptimistic(rows, (current, change: { ids: string[]; paid: boolean }) =>
    current.map((row) => (change.ids.includes(row.id) ? { ...row, paid: change.paid } : row)),
  );
  const search = useDeferredValue(query);

  const counts = { unpaid: optimistic.filter((row) => !row.paid).length, paid: optimistic.filter((row) => row.paid).length, all: optimistic.length };
  const shown = useMemo(() => {
    const words = fold(search).split(/\s+/).filter(Boolean);
    return optimistic.filter((row) => {
      if (view === "unpaid" && row.paid) return false;
      if (view === "paid" && !row.paid) return false;
      const haystack = fold(`${row.firstName} ${row.lastName} ${row.email} ${row.memberNumber ?? ""}`);
      return words.every((word) => haystack.includes(word));
    });
  }, [optimistic, view, search]);

  const visibleSelected = selected.filter((id) => shown.some((row) => row.id === id));
  const allChosen = shown.length > 0 && visibleSelected.length === shown.length;
  const unpaidChosen = visibleSelected.filter((id) => !optimistic.find((row) => row.id === id)?.paid);

  const toggle = (id: string) => setSelected((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));

  const mark = (ids: string[], paid: boolean) =>
    startTransition(async () => {
      setPaid({ ids, paid });
      try {
        const result = await post("/api/v1/members/dues", { ids, paid });
        setSelected([]);
        // Fees paid online are refunded from Finances (the money goes back), not cancelled here.
        if (result.online?.length) notify.info(t("paidOnline", { count: result.online.length }));
        notify.success(t(paid ? "recordedMany" : "cancelledMany", { count: ids.length }), {
          action: {
            label: t("undo"),
            onClick: () =>
              startTransition(async () => {
                setPaid({ ids, paid: !paid });
                await post("/api/v1/members/dues", { ids, paid: !paid }).catch(() => notify.error(t("error")));
                router.refresh();
              }),
          },
        });
      } catch {
        notify.error(t("error"));
      }
      router.refresh();
    });

  const remind = (ids: string[]) =>
    startTransition(async () => {
      try {
        const { queued = 0 } = await post("/api/v1/members/reminders", { ids, kind: "fee" });
        setSelected([]);
        notify.success(queued ? t("reminded", { count: queued }) : t("remindedNone"));
      } catch {
        notify.error(t("error"));
      }
    });

  return (
    <div className="space-y-3 pb-20 lg:pb-0">
      <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none]" role="tablist" aria-label={t("viewsLabel")}>
        {(["unpaid", "paid", "all"] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={view === value}
            onClick={() => {
              setView(value);
              setSelected([]);
            }}
            className={chip(view === value)}
          >
            {t(`views.${value}`)}
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
        <div className="overflow-hidden rounded-[14px] border bg-card">
          <label className="flex cursor-pointer items-center gap-3 border-b bg-foreground/[0.02] px-3.5 py-2.5 text-[13px] text-muted-foreground">
            <input
              type="checkbox"
              checked={allChosen}
              onChange={() => setSelected(allChosen ? [] : shown.map((row) => row.id))}
              className="size-[18px] accent-psg-blue"
            />
            {t("selectAll", { count: shown.length })}
          </label>
          <ul className="divide-y">
            {shown.map((row) => {
              const name = `${row.firstName} ${row.lastName}`.trim();
              const chosen = selected.includes(row.id);
              return (
                <li key={row.id} className={cn("flex items-center gap-3 px-3.5 py-2.5 transition-colors", chosen && "bg-psg-blue/[0.04] dark:bg-white/[0.04]")}>
                  <input
                    type="checkbox"
                    checked={chosen}
                    onChange={() => toggle(row.id)}
                    aria-label={t("select", { name })}
                    className="size-[18px] shrink-0 accent-psg-blue"
                  />
                  <UserAvatar name={name} email={row.email} image={row.image} className="size-9 rounded-[9px] text-[10px] max-sm:hidden" />
                  <Link href={`/admin/members/${row.id}`} prefetch={false} className="min-w-0 flex-1 hover:underline">
                    <span className="block truncate text-[15px] font-semibold">{name}</span>
                    <span className="block truncate text-[12px] text-muted-foreground">{row.memberNumber ?? row.email}</span>
                  </Link>
                  <StatusPill tone={row.paid ? "ok" : "danger"} className="max-sm:hidden">
                    {t(row.paid ? "badgePaid" : "badgeUnpaid")}
                  </StatusPill>
                  {row.paid ? null : (
                    <button type="button" disabled={pending} onClick={() => mark([row.id], true)} className={adminButton("secondary", "sm")} title={t("record")}>
                      <Check aria-hidden />
                      <span className="max-sm:sr-only">{t("record")}</span>
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <p className="rounded-[14px] border border-dashed p-8 text-center text-sm text-muted-foreground">{t(view === "unpaid" && !search ? "allPaid" : "empty")}</p>
      )}

      {/* The selection's actions, pinned at the bottom (above the phone's tab bar). */}
      <div
        data-open={visibleSelected.length > 0 || undefined}
        className="pointer-events-none fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 flex translate-y-4 justify-center px-3 opacity-0 transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] data-[open]:pointer-events-auto data-[open]:translate-y-0 data-[open]:opacity-100 lg:bottom-6 lg:pl-60"
      >
        <div className="flex w-full max-w-xl items-center gap-2 rounded-[14px] border bg-popover p-2 shadow-xl">
          <button type="button" onClick={() => setSelected([])} className={adminButton("ghost", "icon")} title={t("clearSelection")}>
            <X aria-hidden />
            <span className="sr-only">{t("clearSelection")}</span>
          </button>
          <span className="min-w-0 flex-1 truncate text-[13px] font-medium" aria-live="polite">
            {t("selected", { count: visibleSelected.length })}
          </span>
          {unpaidChosen.length ? (
            <>
              <button type="button" disabled={pending} onClick={() => remind(unpaidChosen)} className={adminButton("secondary", "sm")}>
                <MailWarning aria-hidden />
                <span className="max-sm:sr-only">{t("remind")}</span>
              </button>
              <button type="button" disabled={pending} onClick={() => mark(unpaidChosen, true)} className={adminButton("primary", "sm")}>
                <Check aria-hidden />
                {t("recordCount", { count: unpaidChosen.length })}
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={pending}
              onClick={async () => {
                const ids = visibleSelected;
                if ((await ask({ title: t("cancelTitle", { count: ids.length }), body: t("cancelBody"), confirmLabel: t("cancelCount", { count: ids.length }), tone: "danger" })) !== null) mark(ids, false);
              }}
              className={adminButton("danger", "sm")}
            >
              {t("cancelCount", { count: visibleSelected.length })}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
