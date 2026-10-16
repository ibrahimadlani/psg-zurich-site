import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { LeaderboardTable, Podium } from "@/components/matches/leaderboard-table";
import { MatchTabs } from "@/components/matches/match-tabs";
import { PageHeader } from "@/components/page-header";
import { Link } from "@/i18n/navigation";
import { closedSeasons, frozenBoard, getLeaderboard, seasonLabel, seasonOf, trophiesOf } from "@/lib/leaderboard";
import { getCurrentMember } from "@/lib/members";
import { redirectToSignIn } from "@/lib/auth-redirect";
import { getSession } from "@/lib/permissions";
import { TableSkeleton } from "@/components/skeletons";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Leaderboard");
  return { title: t("title"), robots: { index: false } };
}

const chip = (on: boolean) =>
  cn(
    "inline-flex h-8 shrink-0 items-center rounded-full border px-3.5 text-[13px] whitespace-nowrap transition-colors",
    on ? "border-foreground bg-foreground text-background" : "bg-card text-muted-foreground hover:text-foreground",
  );

// Members only: names of other members are personal data.
async function LeaderboardContent({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await getSession();
  if (!session) return redirectToSignIn();
  const [t, format, member, closed, params] = await Promise.all([
    getTranslations("Leaderboard"),
    getFormatter(),
    getCurrentMember(),
    closedSeasons(),
    searchParams,
  ]);
  const me = member?.id ?? null;
  const current = seasonOf();
  // A finished season shows its frozen table; anything else, the season under way.
  const picked = closed.find((row) => row.season === Number(params.saison)) ?? null;

  const seasons = closed.length ? (
    <nav aria-label={t("seasons")} className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
      <Link href="/matchs/classement" aria-current={picked ? undefined : "page"} className={chip(!picked)}>
        {seasonLabel(current)}
      </Link>
      {closed.map((row) => (
        <Link key={row.season} href={`/matchs/classement?saison=${row.season}`} aria-current={picked?.season === row.season ? "page" : undefined} className={chip(picked?.season === row.season)}>
          {seasonLabel(row.season)}
        </Link>
      ))}
    </nav>
  ) : null;

  if (picked) {
    const rows = await frozenBoard(picked.season, me);
    const trophies = await trophiesOf(rows.map((row) => row.memberId));
    return (
      <div className="space-y-6">
        {seasons}
        <div className="space-y-1">
          <h2 className="font-narrow text-3xl font-extrabold uppercase italic">
            {t("final")} · {seasonLabel(picked.season)}
          </h2>
          <p className="text-sm text-muted-foreground">{t("frozenNote", { date: format.dateTime(picked.closedAt, { dateStyle: "long" }) })}</p>
        </div>
        <Podium rows={rows} />
        <LeaderboardTable rows={rows} me={me} trophies={trophies} />
      </div>
    );
  }

  const [season, month] = await Promise.all([getLeaderboard("season", me), getLeaderboard("month", me)]);
  const trophies = await trophiesOf([...new Set([...season, ...month].map((row) => row.memberId))]);
  return (
    <div className="space-y-6">
      {seasons}
      <MatchTabs
        labels={{ upcoming: t("seasonOf", { season: seasonLabel(current) }), results: t("month") }}
        upcoming={
          <div className="space-y-3">
            <LeaderboardTable rows={season} me={me} trophies={trophies} />
            <p className="text-[13px] text-muted-foreground">{t("liveNote")}</p>
          </div>
        }
        results={<LeaderboardTable rows={month} me={me} trophies={trophies} />}
      />
    </div>
  );
}

export default async function LeaderboardPage({ searchParams }: PageProps<"/[locale]/matchs/classement">) {
  const t = await getTranslations("Leaderboard");
  return (
    <div className="space-y-6">
      <Link href="/matchs" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden />
        {t("backToMatches")}
      </Link>
      <PageHeader title={t("title")} description={t("description")} />
      <Suspense fallback={<TableSkeleton />}>
        <LeaderboardContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
