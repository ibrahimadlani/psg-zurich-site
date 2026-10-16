"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "overview", href: "/admin/finances" },
  { key: "payments", href: "/admin/finances/paiements" },
  { key: "orders", href: "/admin/finances/commandes" },
  { key: "shop", href: "/admin/finances/boutique" },
  { key: "payouts", href: "/admin/finances/versements" },
  { key: "settings", href: "/admin/finances/reglages" },
] as const;

/** The parts of Finances, as chips that scroll sideways on a phone. */
export function FinanceTabs({ toPrepare }: { toPrepare: number }) {
  const t = useTranslations("AdminFinances.tabs");
  const pathname = usePathname();
  const active = [...TABS].reverse().find((tab) => (tab.href === "/admin/finances" ? pathname === tab.href : pathname.startsWith(tab.href)));
  return (
    <nav aria-label={t("label")} className="-mx-4 mb-6 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:px-0">
      <ul className="flex w-max gap-1.5">
        {TABS.map((tab) => (
          <li key={tab.key}>
            <Link
              href={tab.href}
              aria-current={active?.key === tab.key ? "page" : undefined}
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[13px] whitespace-nowrap transition-colors lg:h-8",
                active?.key === tab.key ? "border-foreground bg-foreground text-background" : "bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {t(tab.key)}
              {tab.key === "orders" && toPrepare ? (
                <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-psg-red px-1 text-[10px] leading-none font-bold text-white tabular-nums">{toPrepare}</span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
