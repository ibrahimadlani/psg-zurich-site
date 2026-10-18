import { Info, X } from "lucide-react";
import type { Metadata } from "next";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { AreaChart } from "@/components/admin/analytics/area-chart";
import { BarList, Delta, Funnel, SplitBar } from "@/components/admin/analytics/charts";
import { AdminForbidden, AdminHeader } from "@/components/admin/ui/admin-header";
import { Kpi } from "@/components/admin/ui/kpi";
import { adminCard, adminLabel } from "@/components/admin/ui/styles";
import { AudienceSkeleton } from "@/components/skeletons";
import { Streamed } from "@/components/ui/streamed";
import type { Locale } from "@/db/schema";
import { Link } from "@/i18n/navigation";
import { adminPage } from "@/lib/admin/guard";
import {
  BUCKET,
  PERIODS,
  apiFigures,
  contentDetail,
  eventFigures,
  liveVisitors,
  rangeOf,
  series,
  sources,
  topContent,
  topMatches,
  topPages,
  totals,
  type Period,
} from "@/lib/analytics/queries";
import { matchTitle } from "@/lib/matches";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("AdminShell");
  return { title: t("sections.audience"), robots: { index: false } };
}

const VIEWS = ["overview", "content", "events", "sources", "api"] as const;
type View = (typeof VIEWS)[number];
type Params = Record<string, string | string[] | undefined>;

const chip = (on: boolean) =>
  cn(
    "inline-flex h-9 shrink-0 items-center rounded-full border px-3.5 text-[13px] whitespace-nowrap transition-colors lg:h-8",
    on ? "border-foreground bg-foreground text-background" : "bg-card text-muted-foreground hover:text-foreground",
  );
const tab = (on: boolean) =>
  cn(
    "relative inline-flex h-11 shrink-0 items-center px-1 font-wide text-[10.5px] font-semibold tracking-[0.07em] whitespace-nowrap uppercase transition-colors",
    on ? "text-foreground after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-psg-blue dark:after:bg-foreground" : "text-muted-foreground hover:text-foreground",
  );
const card = cn(adminCard, "flex min-w-0 flex-col gap-4 p-4 lg:p-5");

/** One block of the page: its small title, then what it shows. */
function Block({ title, children, className, action }: { title: string; children: React.ReactNode; className?: string; action?: React.ReactNode }) {
  return (
    <section className={cn(card, className)}>
      <div className="flex items-center justify-between gap-3">
        <h2 className={adminLabel}>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const percent = (value: number) => `${Math.round(value * 100)} %`;

async function Audience({ searchParams }: { searchParams: Promise<Params> }) {
  await connection();
  const [t, format, locale] = await Promise.all([getTranslations("AdminAudience"), getFormatter(), getLocale()]);
  const session = await adminPage("analytics");
  if (!session) return <AdminForbidden message={(await getTranslations("Admin"))("forbidden")} />;

  const params = await searchParams;
  const period: Period = (PERIODS as readonly string[]).includes(String(params.periode)) ? (params.periode as Period) : "30d";
  const view: View = (VIEWS as readonly string[]).includes(String(params.vue)) ? (params.vue as View) : "overview";
  const staff = params.comite === "1";
  const { current, previous } = rangeOf(period, staff);
  const bucket = BUCKET[period];

  // Links keep the other choices: period, tab, committee.
  const href = (next: { periode?: Period; vue?: View; comite?: boolean; article?: string | null; produit?: string | null }) => {
    const query = new URLSearchParams();
    const p = next.periode ?? period;
    if (p !== "30d") query.set("periode", p);
    const v = next.vue ?? view;
    if (v !== "overview") query.set("vue", v);
    if (next.comite ?? staff) query.set("comite", "1");
    if (next.article) query.set("article", next.article);
    if (next.produit) query.set("produit", next.produit);
    const text = query.toString();
    return `/admin/audience${text ? `?${text}` : ""}`;
  };
  const deltaLabels = { new: t("new"), same: t("same") };
  const live = await liveVisitors(staff);

  let body: React.ReactNode;
  if (view === "overview") {
    const [now, before, points, pages, origin] = await Promise.all([totals(current), totals(previous), series(current), topPages(current, locale as Locale), sources(current)]);
    const spark = (pick: (point: (typeof points)[number]) => number) => points.map(pick);
    body = (
      <div className="flex flex-col gap-4 lg:gap-5">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-4">
          <Kpi label={t("kpi.visitors")} value={now.visitors.toLocaleString("fr-CH")} points={spark((point) => point.visitors)} hint={<Delta current={now.visitors} previous={before.visitors} labels={deltaLabels} />} />
          <Kpi label={t("kpi.views")} value={now.views.toLocaleString("fr-CH")} points={spark((point) => point.views)} hint={<Delta current={now.views} previous={before.views} labels={deltaLabels} />} />
          <Kpi label={t("kpi.visits")} value={now.visits.toLocaleString("fr-CH")} hint={<Delta current={now.visits} previous={before.visits} labels={deltaLabels} />} />
          <Kpi label={t("kpi.pagesPerVisit")} value={format.number(now.pagesPerVisit, { maximumFractionDigits: 1 })} hint={<Delta current={now.pagesPerVisit} previous={before.pagesPerVisit} labels={deltaLabels} />} />
          <Kpi label={t("kpi.members")} value={percent(now.signedInShare)} gauge={now.signedInShare} hint={<Delta current={now.signedInShare} previous={before.signedInShare} labels={deltaLabels} />} />
          <Kpi
            label={t("kpi.signups")}
            value={now.signups}
            hint={
              <span className="flex flex-wrap items-center gap-x-2">
                <Delta current={now.signups} previous={before.signups} labels={deltaLabels} />
                <span>· {t("kpi.conversion", { rate: format.number(now.conversion, { style: "percent", maximumFractionDigits: 1 }) })}</span>
              </span>
            }
          />
        </div>
        <p className="-mt-1 text-[12px] text-muted-foreground">
          {t("kpi.visitorsHint")} · {t("vsPrevious")}
        </p>
        <Block title={t("chart.title")}>
          <AreaChart points={points} bucket={bucket} labels={{ views: t("chart.views"), visitors: t("chart.visitors") }} />
        </Block>
        <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-5">
          <Block title={t("topPages")}>
            <BarList
              valueLabel={t("valueViews")}
              items={pages.map((page) => ({
                key: page.path,
                // A named thing (article, event, match, product) by its name, the address under it.
                label: page.title ?? (page.path === "/" ? t("homePage") : page.path),
                sub: page.title ? page.path : undefined,
                value: page.views,
                aside: t("visitorsCount", { count: page.visitors }),
              }))}
              empty={t("empty")}
            />
          </Block>
          <div className="flex min-w-0 flex-col gap-4 lg:gap-5">
            <Block title={t("entrySources")}>
              <BarList items={origin.referrers.slice(0, 6).map((row) => ({ key: row.key ?? "direct", label: row.key ?? t("direct"), value: row.views }))} empty={t("empty")} />
            </Block>
            <Block title={t("devices")}>
              <SplitBar parts={origin.devices.map((row) => ({ key: row.key ?? "?", label: t(`devicesNames.${row.key as "mobile"}`), value: row.views }))} empty={t("empty")} />
            </Block>
          </div>
        </div>
      </div>
    );
  } else if (view === "content") {
    const article = typeof params.article === "string" ? params.article : null;
    const product = typeof params.produit === "string" ? params.produit : null;
    const [articles, products, detail] = await Promise.all([
      topContent(current, "article", locale as Locale),
      topContent(current, "product", locale as Locale),
      article ? contentDetail(current, "article", article) : product ? contentDetail(current, "product", product) : null,
    ]);
    const selected = article ? articles.find((row) => row.id === article) : product ? products.find((row) => row.id === product) : null;
    body = (
      <div className="flex flex-col gap-4 lg:gap-5">
        {detail && (article || product) ? (
          <Block
            title={`${article ? t("content.detail") : t("content.productDetail")} · ${selected?.title ?? article ?? product}`}
            action={
              <Link href={href({ article: null, produit: null })} scroll={false} aria-label={t("content.close")} className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-foreground/5 hover:text-foreground">
                <X className="size-4" aria-hidden />
              </Link>
            }
          >
            {selected ? (
              <p className="flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-muted-foreground">
                <span>
                  <b className="text-foreground tabular-nums">{selected.views}</b> {t("valueViews")}
                </span>
                <span>
                  <b className="text-foreground tabular-nums">{selected.visitors}</b> {t("valueVisitors")}
                </span>
                <span>{t("content.memberShare", { share: percent(selected.memberShare) })}</span>
              </p>
            ) : null}
            <AreaChart points={detail.series} bucket={bucket} labels={{ views: t("chart.views"), visitors: t("chart.visitors") }} />
            <div className="space-y-2">
              <p className={adminLabel}>{t("content.sources")}</p>
              <BarList items={detail.sources.map((row) => ({ key: row.host ?? "direct", label: row.host ?? t("direct"), value: row.views }))} empty={t("empty")} />
            </div>
          </Block>
        ) : null}
        <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-2 lg:gap-5">
          <Block title={t("content.articles")}>
            <BarList
              valueLabel={t("valueViews")}
              items={articles.map((row) => ({
                key: row.id,
                label: row.title,
                sub: `${t("visitorsCount", { count: row.visitors })} · ${t("content.memberShare", { share: percent(row.memberShare) })}`,
                value: row.views,
                href: href({ article: row.id }),
                selected: row.id === article,
              }))}
              empty={t("empty")}
            />
            {!article && articles.length ? <p className="text-[12px] text-muted-foreground">{t("content.pick")}</p> : null}
          </Block>
          <Block title={t("content.products")}>
            <BarList
              valueLabel={t("valueViews")}
              items={products.map((row) => ({ key: row.id, label: row.title, sub: t("visitorsCount", { count: row.visitors }), value: row.views, href: href({ produit: row.id }), selected: row.id === product }))}
              empty={t("empty")}
            />
          </Block>
        </div>
      </div>
    );
  } else if (view === "events") {
    const [figures, matches] = await Promise.all([eventFigures(current), topMatches(current)]);
    body = (
      <div className="flex flex-col gap-4 lg:gap-5">
        <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-5">
          <Block title={t("events.funnel")}>
            <Funnel
              steps={[
                { key: "clicks", label: t("events.clicks"), value: figures.funnel.clicks },
                { key: "views", label: t("events.pageViewers"), value: figures.funnel.views },
                { key: "registrations", label: t("events.registrations"), value: figures.funnel.registrations },
              ]}
            />
          </Block>
          <Block title={t("events.matches")}>
            <BarList
              valueLabel={t("valueViews")}
              items={matches.map((match) => ({
                key: match.id,
                label: matchTitle(match, "PSG"),
                sub: format.dateTime(match.kickoffAt, { weekday: "short", day: "numeric", month: "short" }),
                value: match.views,
                aside: t("visitorsCount", { count: match.visitors }),
              }))}
              empty={t("empty")}
            />
          </Block>
        </div>
        <Block title={t("events.table")}>
          {figures.rows.length ? (
            <div className="-mx-4 overflow-x-auto px-4 lg:-mx-5 lg:px-5">
              <table className="w-full min-w-[34rem] text-[13.5px]">
                <thead>
                  <tr className="border-b text-left text-[11px] text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">{t("events.event")}</th>
                    <th className="px-2 py-2 text-right font-medium">{t("events.clicks")}</th>
                    <th className="px-2 py-2 text-right font-medium">{t("valueViews")}</th>
                    <th className="px-2 py-2 text-right font-medium">{t("valueVisitors")}</th>
                    <th className="py-2 pl-2 text-right font-medium">{t("events.registrations")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {figures.rows.map((row) => (
                    <tr key={row.id}>
                      <td className="py-2.5 pr-3">
                        <Link href={`/admin/events/${row.id}`} className="font-medium hover:underline">
                          {row.title}
                        </Link>
                        <span className="block text-[12px] text-muted-foreground">{format.dateTime(row.startsAt, { weekday: "short", day: "numeric", month: "short" })}</span>
                      </td>
                      <td className="px-2 py-2.5 text-right tabular-nums">{row.clicks}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums">{row.views}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums">{row.visitors}</td>
                      <td className="py-2.5 pl-2 text-right font-semibold tabular-nums">{row.registrations}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="rounded-[12px] border border-dashed px-4 py-8 text-center text-[13px] text-muted-foreground">{t("empty")}</p>
          )}
        </Block>
      </div>
    );
  } else if (view === "sources") {
    const origin = await sources(current);
    body = (
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-2 lg:gap-5">
        <Block title={t("sources.referrers")}>
          <BarList valueLabel={t("valueViews")} items={origin.referrers.map((row) => ({ key: row.key ?? "direct", label: row.key ?? t("direct"), value: row.views }))} empty={t("empty")} />
        </Block>
        <div className="flex min-w-0 flex-col gap-4 lg:gap-5">
          <Block title={t("sources.audience")}>
            <SplitBar
              parts={[
                { key: "visitors", label: t("sources.visitors"), value: origin.total - origin.members },
                { key: "members", label: t("sources.members"), value: origin.members },
              ]}
              empty={t("empty")}
            />
          </Block>
          <Block title={t("devices")}>
            <SplitBar parts={origin.devices.map((row) => ({ key: row.key ?? "?", label: t(`devicesNames.${row.key as "mobile"}`), value: row.views }))} empty={t("empty")} />
          </Block>
          <Block title={t("sources.languages")}>
            <SplitBar parts={origin.locales.map((row) => ({ key: row.key ?? "?", label: (row.key ?? "?").toUpperCase(), value: row.views }))} empty={t("empty")} />
          </Block>
        </div>
        <Block title={t("sources.campaigns")}>
          <BarList items={origin.campaigns.map((row) => ({ key: row.key!, label: row.key!, value: row.views }))} empty={t("sources.noCampaign")} />
        </Block>
        <Block title={t("sources.browsers")}>
          <BarList items={origin.browsers.map((row) => ({ key: row.key ?? "?", label: row.key ?? "?", value: row.views }))} empty={t("empty")} />
        </Block>
      </div>
    );
  } else {
    const [now, before] = await Promise.all([apiFigures(current), apiFigures(previous)]);
    body = (
      <div className="flex flex-col gap-4 lg:gap-5">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          <Kpi label={t("api.calls")} value={now.calls.toLocaleString("fr-CH")} points={now.series.map((point) => point.views)} hint={<Delta current={now.calls} previous={before.calls} labels={deltaLabels} />} />
          <Kpi label={t("api.errorRate")} value={format.number(now.errorRate, { style: "percent", maximumFractionDigits: 1 })} hint={<Delta current={now.errorRate} previous={before.errorRate} inverse labels={deltaLabels} />} />
          <Kpi label={t("api.serverErrors")} value={now.serverErrors} hint={<Delta current={now.serverErrors} previous={before.serverErrors} inverse labels={deltaLabels} />} />
          <Kpi label={t("api.avg")} value={t("api.ms", { value: Math.round(now.avgMs) })} hint={<Delta current={now.avgMs} previous={before.avgMs} inverse labels={deltaLabels} />} />
        </div>
        <Block title={t("api.chart")}>
          <AreaChart points={now.series} bucket={bucket} labels={{ views: t("api.callsSeries"), visitors: t("api.errorsSeries") }} />
        </Block>
        <Block title={t("api.routes")}>
          {now.rows.length ? (
            <div className="-mx-4 overflow-x-auto px-4 lg:-mx-5 lg:px-5">
              <table className="w-full min-w-[36rem] text-[13px]">
                <thead>
                  <tr className="border-b text-left text-[11px] text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">{t("api.route")}</th>
                    <th className="px-2 py-2 text-right font-medium">{t("api.count")}</th>
                    <th className="px-2 py-2 text-right font-medium">{t("api.time")}</th>
                    <th className="py-2 pl-2 text-right font-medium">{t("api.errors")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {now.rows.map((row) => (
                    <tr key={`${row.method} ${row.route}`}>
                      <td className="py-2 pr-3">
                        <span className="mr-2 inline-block w-14 font-mono text-[11px] font-semibold text-muted-foreground">{row.method}</span>
                        <span className="font-mono text-[12.5px] break-all">{row.route}</span>
                      </td>
                      <td className="px-2 py-2 text-right font-semibold tabular-nums">{row.calls.toLocaleString("fr-CH")}</td>
                      <td className="px-2 py-2 text-right whitespace-nowrap text-muted-foreground tabular-nums">
                        {Math.round(row.avgMs)} / {row.maxMs} ms
                      </td>
                      <td className={cn("py-2 pl-2 text-right whitespace-nowrap tabular-nums", row.serverErrors ? "font-semibold text-psg-red" : "text-muted-foreground")}>
                        {row.clientErrors} / {row.serverErrors}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="rounded-[12px] border border-dashed px-4 py-8 text-center text-[13px] text-muted-foreground">{t("empty")}</p>
          )}
        </Block>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-5">
      {/* Period, committee, and who is on the site right now. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label={t("periodLabel")} className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
          {PERIODS.map((value) => (
            <Link key={value} href={href({ periode: value })} scroll={false} aria-current={period === value ? "page" : undefined} className={chip(period === value)}>
              {t(`periods.${value}`)}
            </Link>
          ))}
        </nav>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex h-8 items-center gap-2 rounded-full bg-ok/12 px-3 text-[12px] font-semibold text-ok">
            <span className="relative flex size-2">
              {live ? <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-ok/70 motion-reduce:hidden" /> : null}
              <span className="relative size-2 rounded-full bg-ok" />
            </span>
            {t("live", { count: live })}
          </span>
          <Link href={href({ comite: !staff })} scroll={false} aria-pressed={staff} className={chip(staff)}>
            {t("includeStaff")}
          </Link>
        </div>
      </div>

      <nav aria-label={t("viewsLabel")} className="-mx-4 flex gap-6 overflow-x-auto border-b px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
        {VIEWS.map((value) => (
          <Link key={value} href={href({ vue: value })} scroll={false} aria-current={view === value ? "page" : undefined} className={tab(view === value)}>
            {t(`views.${value}`)}
          </Link>
        ))}
      </nav>

      <div key={`${view}-${period}`} className="animate-content-in">
        {body}
      </div>

      <p className="flex items-start gap-2 text-[12px] leading-relaxed text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        {t("privacy")}
      </p>
    </div>
  );
}

/** Admins: visits, reads, sources and API use, cookie-free (lib/analytics). */
export default async function AudiencePage({ searchParams }: { searchParams: Promise<Params> }) {
  const t = await getTranslations("AdminAudience");
  return (
    <>
      <AdminHeader title={t("title")} description={t("description")} />
      <Streamed fallback={<AudienceSkeleton />}>
        <Audience searchParams={searchParams} />
      </Streamed>
    </>
  );
}
