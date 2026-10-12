import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { LeaderboardTable } from "@/components/matches/leaderboard-table";
import { MatchTabs } from "@/components/matches/match-tabs";
import { PageHeader } from "@/components/page-header";
import { Link, redirect } from "@/i18n/navigation";
import { getLeaderboard } from "@/lib/leaderboard";
import { getCurrentMember } from "@/lib/members";
import { getSession } from "@/lib/permissions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Leaderboard");
  return { title: t("title"), robots: { index: false } };
}

// Members only: names of other members are personal data.
async function LeaderboardContent() {
  const session = await getSession();
  if (!session) return redirect({ href: "/connexion", locale: await getLocale() });
  const t = await getTranslations("Leaderboard");
  const member = await getCurrentMember();
  const me = member?.id ?? null;
  const [season, month] = await Promise.all([getLeaderboard("season", me), getLeaderboard("month", me)]);

  return (
    <MatchTabs
      labels={{ upcoming: t("season"), results: t("month") }}
      upcoming={<LeaderboardTable rows={season} me={me} />}
      results={<LeaderboardTable rows={month} me={me} />}
    />
  );
}

export default async function LeaderboardPage() {
  const t = await getTranslations("Leaderboard");
  return (
    <div className="space-y-6">
      <Link href="/matchs" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden />
        {t("backToMatches")}
      </Link>
      <PageHeader title={t("title")} description={t("description")} />
      <Suspense fallback={<p className="text-muted-foreground">{t("loading")}</p>}>
        <LeaderboardContent />
      </Suspense>
    </div>
  );
}
