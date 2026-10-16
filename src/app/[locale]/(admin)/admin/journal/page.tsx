import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import { getFormatter, getNow, getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { Suspense } from "react";
import { AdminForbidden, AdminHeader } from "@/components/admin/ui/admin-header";
import { adminButton, adminLabel } from "@/components/admin/ui/styles";
import { AdminListSkeleton } from "@/components/skeletons";
import { UserAvatar } from "@/components/user-avatar";
import { Link } from "@/i18n/navigation";
import { AUDIT_DOMAINS, auditPage, type AuditDomain } from "@/lib/admin/audit-query";
import { adminPage } from "@/lib/admin/guard";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("AdminShell");
  return { title: t("sections.journal"), robots: { index: false } };
}

const chip = (on: boolean) =>
  cn(
    "inline-flex h-9 shrink-0 items-center rounded-full border px-3.5 text-[13px] whitespace-nowrap transition-colors lg:h-8",
    on ? "border-foreground bg-foreground text-background" : "bg-card text-muted-foreground hover:text-foreground",
  );

async function Journal({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const [t, format, now] = await Promise.all([getTranslations("AdminAudit"), getFormatter(), getNow()]);
  const session = await adminPage("audit");
  if (!session) return <AdminForbidden message={(await getTranslations("Admin"))("forbidden")} />;
  const params = await searchParams;
  const domain = (AUDIT_DOMAINS as readonly string[]).includes(String(params.domaine)) ? (params.domaine as AuditDomain) : null;
  const page = Math.max(0, Math.min(200, Number(params.page) || 0));
  const { entries, more } = await auditPage(domain, page);
  const href = (next: { domaine?: AuditDomain | null; page?: number }) => {
    const query = new URLSearchParams();
    const d = next.domaine === undefined ? domain : next.domaine;
    if (d) query.set("domaine", d);
    if (next.page) query.set("page", String(next.page));
    const text = query.toString();
    return `/admin/journal${text ? `?${text}` : ""}`;
  };

  // Entries under day headings ("Aujourd'hui", "jeudi 15 octobre").
  const days = new Map<string, typeof entries>();
  for (const entry of entries) {
    const key = format.dateTime(entry.createdAt, { weekday: "long", day: "numeric", month: "long", year: entry.createdAt.getFullYear() === now.getFullYear() ? undefined : "numeric" });
    days.set(key, [...(days.get(key) ?? []), entry]);
  }

  return (
    <div className="space-y-6">
      <nav aria-label={t("filters")} className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
        <Link href={href({ domaine: null })} aria-current={domain === null ? "page" : undefined} className={chip(domain === null)}>
          {t("all")}
        </Link>
        {AUDIT_DOMAINS.map((value) => (
          <Link key={value} href={href({ domaine: value })} aria-current={domain === value ? "page" : undefined} className={chip(domain === value)}>
            {t(`domains.${value}`)}
          </Link>
        ))}
      </nav>

      {entries.length ? (
        [...days.entries()].map(([day, list]) => (
          <section key={day} className="space-y-2">
            <h2 className={adminLabel}>{day}</h2>
            <ol className="divide-y overflow-hidden rounded-[14px] border bg-card">
              {list.map((entry) => {
                const key = `actions.${entry.action.replace(".", "_")}`;
                const label = t.has(key as never) ? t(key as never) : entry.action;
                const body = (
                  <>
                    <UserAvatar name={entry.actor ?? "?"} email={entry.actor ?? "?"} className="size-8 rounded-[8px] text-[10px]" />
                    <span className="min-w-0 flex-1 text-[14px] leading-snug">
                      <span className="font-semibold">{entry.actor ?? t("system")}</span> <span className="text-muted-foreground">·</span> {label}
                      {entry.target ? <span className="font-medium"> · {entry.target}</span> : null}
                      {entry.about ? <span className="text-muted-foreground"> · {entry.about}</span> : null}
                      {entry.count !== null ? <span className="text-muted-foreground"> · {t("count", { count: entry.count })}</span> : null}
                      {entry.reason ? <span className="mt-0.5 block text-[13px] text-muted-foreground">« {entry.reason} »</span> : null}
                    </span>
                    <span className="shrink-0 text-[12px] text-muted-foreground tabular-nums">{format.dateTime(entry.createdAt, { hour: "2-digit", minute: "2-digit" })}</span>
                    {entry.href ? <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden /> : <span aria-hidden className="w-4 shrink-0" />}
                  </>
                );
                return (
                  <li key={entry.id}>
                    {entry.href ? (
                      <Link href={entry.href} prefetch={false} className="flex items-center gap-3 px-3.5 py-3 transition-colors hover:bg-foreground/[0.03]">
                        {body}
                      </Link>
                    ) : (
                      <div className="flex items-center gap-3 px-3.5 py-3">{body}</div>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        ))
      ) : (
        <p className="rounded-[14px] border border-dashed p-8 text-center text-sm text-muted-foreground">{t("empty")}</p>
      )}

      {page > 0 || more ? (
        <div className="flex justify-between gap-2">
          {page > 0 ? (
            <Link href={href({ page: page - 1 })} className={adminButton("secondary", "sm")}>
              {t("newer")}
            </Link>
          ) : (
            <span />
          )}
          {more ? (
            <Link href={href({ page: page + 1 })} className={adminButton("secondary", "sm")}>
              {t("older")}
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Who did what in the admin (superadmin): every committee action, newest first. */
export default async function JournalPage({ searchParams }: PageProps<"/[locale]/admin/journal">) {
  const [t, tShell] = await Promise.all([getTranslations("AdminAudit"), getTranslations("AdminShell")]);
  return (
    <>
      <AdminHeader title={tShell("sections.journal")} description={t("description")} />
      <Suspense fallback={<AdminListSkeleton />}>
        <Journal searchParams={searchParams} />
      </Suspense>
    </>
  );
}
