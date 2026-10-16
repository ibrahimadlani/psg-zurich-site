"use client";

import { Search } from "lucide-react";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { StatusPill, type PillTone } from "@/components/admin/ui/status-pill";
import { adminInput } from "@/components/admin/ui/styles";
import { Link, usePathname } from "@/i18n/navigation";
import { formatChf } from "@/lib/money";
import { formatPaymentReference } from "@/lib/payments/config";
import { cn } from "@/lib/utils";

type Row = {
  id: string;
  reference: number;
  kind: "dues" | "shop" | "donation";
  status: string;
  amount: number;
  refundedAmount: number;
  method: string | null;
  payerName: string;
  anonymous: boolean;
  receiptNumber: string | null;
  paidAt: Date | null;
  createdAt: Date;
};

const TONE: Record<string, PillTone> = { succeeded: "ok", processing: "warn", pending: "neutral", failed: "danger", refunded: "neutral", partially_refunded: "warn" };
const FILTERS = ["paid", "refunds", "open"] as const;
const KINDS = ["dues", "shop", "donation"] as const;
const fold = (text: string) => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

const chip = (on: boolean) =>
  cn(
    "inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-[13px] whitespace-nowrap transition-colors lg:h-8",
    on ? "border-foreground bg-foreground text-background" : "bg-card text-muted-foreground hover:text-foreground",
  );

/** Every payment, filtered on the page: what state, what for, who (name, P-…, Q-…). */
export function PaymentsList({ rows }: { rows: Row[] }) {
  const t = useTranslations("AdminFinances");
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const pathname = usePathname();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("paid");
  const [kind, setKind] = useState<(typeof KINDS)[number] | null>(null);
  const [query, setQuery] = useState("");

  const shown = useMemo(() => {
    const states = filter === "refunds" ? ["refunded", "partially_refunded"] : filter === "open" ? ["pending", "processing", "failed"] : ["succeeded", "processing", "refunded", "partially_refunded"];
    const q = fold(query.trim());
    return rows.filter(
      (row) =>
        states.includes(row.status) &&
        (!kind || row.kind === kind) &&
        (!q || fold(`${row.payerName} ${formatPaymentReference(row.reference)} ${row.receiptNumber ?? ""}`).includes(q)),
    );
  }, [rows, filter, kind, query]);

  return (
    <div className="flex flex-col gap-3">
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
        {FILTERS.map((value) => (
          <button key={value} type="button" onClick={() => setFilter(value)} className={chip(filter === value)}>
            {t(`filters.${value}`)}
          </button>
        ))}
        <span aria-hidden className="mx-1 w-px shrink-0 self-stretch bg-border" />
        {KINDS.map((value) => (
          <button key={value} type="button" onClick={() => setKind((current) => (current === value ? null : value))} className={chip(kind === value)}>
            {t(`kinds.${value}`)}
          </button>
        ))}
      </div>
      <label className="relative">
        <span className="sr-only">{t("search")}</span>
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("search")} className={cn(adminInput, "pl-9")} />
      </label>
      {shown.length === 0 ? (
        <p className="rounded-[12px] border border-dashed px-4 py-10 text-center text-[14px] text-muted-foreground">{t("none")}</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {shown.map((row) => {
            const href = `/admin/finances/paiements/${row.id}`;
            const on = pathname === href;
            return (
              <li key={row.id}>
                <Link
                  href={href}
                  aria-current={on ? "page" : undefined}
                  className={cn("flex items-center gap-3 rounded-[12px] border px-3.5 py-3 transition-colors", on ? "border-foreground/30 bg-foreground/[0.04]" : "bg-card hover:border-foreground/20")}
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-[14px] font-semibold">{row.anonymous ? `${row.payerName} · ${t("anonymous")}` : row.payerName}</span>
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted-foreground">
                      <span>{t(`kinds.${row.kind}`)}</span>
                      <span>·</span>
                      <span className="font-mono">{row.receiptNumber ?? formatPaymentReference(row.reference)}</span>
                      <span>·</span>
                      <time dateTime={new Date(row.paidAt ?? row.createdAt).toISOString()} suppressHydrationWarning>
                        {format.relativeTime(new Date(row.paidAt ?? row.createdAt), now)}
                      </time>
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <span className={cn("text-[14px] font-semibold tabular-nums", row.status === "refunded" && "text-muted-foreground line-through")}>{formatChf(row.amount)}</span>
                    {row.status !== "succeeded" ? <StatusPill tone={TONE[row.status] ?? "neutral"}>{t(`status.${row.status}` as never)}</StatusPill> : null}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
