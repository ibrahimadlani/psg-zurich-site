import { ChevronRight, PauseCircle } from "lucide-react";
import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { Suspense } from "react";
import { AutomationControls } from "@/components/mailing/automation-controls";
import { JobActions, MailingSettingsForm, NewCampaignButton } from "@/components/mailing/mailing-actions";
import { AdminHeader } from "@/components/admin/ui/admin-header";
import { Badge } from "@/components/ui/badge";
import { EMAIL_JOB_STATUSES } from "@/db/schema";
import { Link } from "@/i18n/navigation";
import {
  automationMessageKey,
  automationsOverview,
  campaignsList,
  journal,
  requireMailingAdmin,
} from "@/lib/mailing/admin-data";
import { getMailingSettings } from "@/lib/mailing/queue";
import { MAIL_GROUPS } from "@/lib/mailing/registry";
import { cn } from "@/lib/utils";
import { AdminSkeleton } from "@/components/skeletons";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Mailing");
  return { title: t("title"), robots: { index: false } };
}

const TABS = { automatisations: "automations", campagnes: "campaigns", journal: "journal", reglages: "settings" } as const;
type Tab = keyof typeof TABS;
const card = "rounded-[14px] border bg-card shadow-brand";

async function Automations() {
  const t = await getTranslations("Mailing");
  const list = await automationsOverview();
  return (
    <div className="space-y-8">
      <p className="text-sm text-muted-foreground">{t("categoryHint")}</p>
      {MAIL_GROUPS.map((group) => (
        <section key={group} className="space-y-3">
          <h2 className="font-wide text-xs font-semibold tracking-[0.08em] uppercase">{t(`groups.${group}`)}</h2>
          <ul className={cn(card, "divide-y")}>
            {list
              .filter((item) => item.group === group)
              .map((item) => {
                const key = automationMessageKey(item.key);
                return (
                  <li key={item.key} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn("font-semibold", !item.enabled && "text-muted-foreground line-through")}>
                          {t(`automations.${key}.name` as never)}
                        </span>
                        <Badge variant={item.category === "transactional" ? "secondary" : "outline"}>{t(`categories.${item.category}`)}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{t(`automations.${key}.when` as never)}</p>
                      <p className="text-xs text-muted-foreground">{t("sent30", { count: item.sent30 })}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <AutomationControls automationKey={item.key} enabled={item.enabled} delayMinutes={item.delayMinutes} />
                      <Link
                        href={`/admin/mailing/automations/${item.key}`}
                        className="inline-flex items-center gap-1 text-sm font-medium hover:underline"
                      >
                        {t("editTexts")}
                        <ChevronRight className="size-4" aria-hidden />
                      </Link>
                    </div>
                  </li>
                );
              })}
          </ul>
        </section>
      ))}
    </div>
  );
}

async function Campaigns() {
  const [t, format] = await Promise.all([getTranslations("Mailing"), getFormatter()]);
  const list = await campaignsList();
  return (
    <div className="space-y-4">
      <NewCampaignButton />
      {list.length === 0 ? <p className="text-sm text-muted-foreground">{t("campaigns.empty")}</p> : null}
      {list.length > 0 ? (
        <ul className={cn(card, "divide-y")}>
          {list.map((campaign) => (
            <li key={campaign.id}>
              <Link href={`/admin/mailing/campaigns/${campaign.id}`} className="flex items-center gap-3 p-4 hover:bg-foreground/[0.03]">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{campaign.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {t(`campaigns.audiences.${campaign.audience}`)}
                    {campaign.status === "sent" ? ` · ${t("campaigns.sentCount", { count: campaign.sentCount })}` : ""}
                    {campaign.scheduledAt ? ` · ${format.dateTime(campaign.scheduledAt, { dateStyle: "medium", timeStyle: "short" })}` : ""}
                  </p>
                </div>
                <Badge variant={campaign.status === "sent" ? "secondary" : "outline"}>{t(`campaigns.status.${campaign.status}`)}</Badge>
                <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

async function Journal({ status }: { status: string | undefined }) {
  const [t, format] = await Promise.all([getTranslations("Mailing"), getFormatter()]);
  const rows = await journal(status);
  const filters = [undefined, ...EMAIL_JOB_STATUSES];
  return (
    <div className="space-y-4">
      <nav aria-label={t("journal.filter")} className="flex flex-wrap gap-1.5">
        {filters.map((value) => (
          <Link
            key={value ?? "all"}
            href={value ? `/admin/mailing?onglet=journal&statut=${value}` : "/admin/mailing?onglet=journal"}
            className={cn(
              "rounded-full border px-3 py-1 text-xs",
              status === value || (!status && !value) ? "bg-segment text-segment-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {value ? t(`journal.status.${value}`) : t("journal.all")}
          </Link>
        ))}
      </nav>
      {rows.length === 0 ? <p className="text-sm text-muted-foreground">{t("journal.empty")}</p> : null}
      {rows.length > 0 ? (
        <ul className={cn(card, "divide-y")}>
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 p-3 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {row.automationKey
                    ? t(`automations.${automationMessageKey(row.automationKey)}.name` as never)
                    : t("journal.campaign", { name: row.campaignName ?? "—" })}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {row.toEmail} · {format.dateTime(row.sentAt ?? row.sendAfter, { dateStyle: "short", timeStyle: "short" })}
                </p>
                {row.lastError ? <p className="truncate text-xs text-destructive">{row.lastError}</p> : null}
              </div>
              <Badge variant={row.status === "sent" ? "secondary" : row.status === "failed" ? "destructive" : "outline"}>
                {t(`journal.status.${row.status}`)}
              </Badge>
              <JobActions id={row.id} status={row.status} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

async function Settings() {
  const settings = await getMailingSettings();
  return (
    <div className={cn(card, "p-5")}>
      <MailingSettingsForm paused={settings.paused} dailyCap={settings.dailyCap} perMinute={settings.perMinute} />
    </div>
  );
}

async function MailingContent({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const t = await getTranslations("Mailing");
  if (!(await requireMailingAdmin())) return <p className="text-destructive">{t("error")}</p>;
  const params = await searchParams;
  const requested = typeof params.onglet === "string" ? params.onglet : "";
  const tab: Tab = requested in TABS ? (requested as Tab) : "automatisations";
  const settings = await getMailingSettings();

  return (
    <div className="space-y-6">
      {settings.paused ? (
        <p className="flex items-center gap-2 rounded-[12px] border border-psg-red/30 bg-psg-red/5 p-3 text-sm font-medium">
          <PauseCircle className="size-4 text-psg-red" aria-hidden />
          {t("settings.pausedBanner")}
        </p>
      ) : null}
      {/* Same chips as the other admin lists; scroll sideways on a phone. */}
      <nav aria-label={t("title")} className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
        {(Object.keys(TABS) as Tab[]).map((value) => (
          <Link
            key={value}
            href={`/admin/mailing?onglet=${value}`}
            aria-current={tab === value ? "page" : undefined}
            className={cn(
              "inline-flex h-9 shrink-0 items-center rounded-full border px-3.5 text-[13px] whitespace-nowrap transition-colors lg:h-8",
              tab === value ? "border-foreground bg-foreground text-background" : "bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {t(`tabs.${TABS[value]}`)}
          </Link>
        ))}
      </nav>
      {tab === "automatisations" ? <Automations /> : null}
      {tab === "campagnes" ? <Campaigns /> : null}
      {tab === "journal" ? <Journal status={typeof params.statut === "string" ? params.statut : undefined} /> : null}
      {tab === "reglages" ? <Settings /> : null}
    </div>
  );
}

export default async function MailingPage({ searchParams }: PageProps<"/[locale]/admin/mailing">) {
  const t = await getTranslations("Mailing");
  return (
    <>
      <AdminHeader title={t("title")} description={t("description")} />
      <Suspense fallback={<AdminSkeleton />}>
        <MailingContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}
