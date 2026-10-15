import type { Metadata } from "next";
import { getFormatter, getNow, getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { Suspense } from "react";
import type { MatchFormValues } from "@/components/admin/match-form";
import { MatchRowActions, MatchSyncButton, NewMatchButton } from "@/components/admin/matches/match-admin-controls";
import { AdminForbidden, AdminHeader } from "@/components/admin/ui/admin-header";
import { StatusPill } from "@/components/admin/ui/status-pill";
import { adminLabel } from "@/components/admin/ui/styles";
import { CompetitionLabel } from "@/components/matches/match-row";
import { sides } from "@/components/matches/match-utils";
import { TeamCrest } from "@/components/matches/team-crest";
import { AdminListSkeleton } from "@/components/skeletons";
import { Link } from "@/i18n/navigation";
import { adminPage } from "@/lib/admin/guard";
import { lastMatchSync, listAdminMatches, toLocalInput } from "@/lib/admin/events-query";
import { matchTitle, type Match } from "@/lib/matches";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("AdminShell");
  return { title: t("sections.matches"), robots: { index: false } };
}

/** Form values of a match entered by hand. */
function formValues(match: Match): MatchFormValues {
  const differs = (value: number | null, final: number | null) => (value !== null && value !== final ? String(value) : "");
  return {
    competition: match.competition,
    round: match.round ?? "",
    opponent: match.opponent,
    opponentLogo: match.opponentLogo ?? "",
    kickoffAt: toLocalInput(match.kickoffAt),
    venue: match.venue,
    stadium: match.stadium ?? "",
    city: match.city ?? "",
    status: match.status,
    psgScore: match.psgScore?.toString() ?? "",
    opponentScore: match.opponentScore?.toString() ?? "",
    regulationPsgScore: differs(match.regulationPsgScore, match.psgScore),
    regulationOpponentScore: differs(match.regulationOpponentScore, match.opponentScore),
    penaltyPsgScore: match.penaltyPsgScore?.toString() ?? "",
    penaltyOpponentScore: match.penaltyOpponentScore?.toString() ?? "",
  };
}

async function Matches() {
  await connection();
  const [t, tShell, format, now] = await Promise.all([getTranslations("AdminMatches"), getTranslations("AdminShell"), getFormatter(), getNow()]);
  const session = await adminPage("events", "/admin/matchs");
  if (!session) return <AdminForbidden message={(await getTranslations("Admin"))("forbidden")} />;
  const [rows, synced] = await Promise.all([listAdminMatches(), lastMatchSync()]);
  const upcoming = rows.filter(({ match }) => match.status === "scheduled" || match.status === "live" || match.kickoffAt >= now);
  const recent = rows.filter((row) => !upcoming.includes(row)).reverse();

  const list = (items: typeof rows) => (
    <ul className="divide-y overflow-hidden rounded-[14px] border bg-card">
      {items.map(({ match, events }) => {
        const [home, away] = sides(match);
        const played = match.psgScore !== null && match.opponentScore !== null;
        const manual = match.externalId === null;
        const kickoff = new Date(match.kickoffAt.getTime() - 30 * 60 * 1000);
        return (
          <li key={match.id} className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-3.5">
              <span className="flex w-11 shrink-0 flex-col items-center leading-none">
                <span className="font-wide text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">{format.dateTime(match.kickoffAt, { weekday: "short" })}</span>
                <span className="font-narrow text-[28px] leading-none font-extrabold tabular-nums italic">{format.dateTime(match.kickoffAt, { day: "numeric" })}</span>
                <span className="text-[10px] text-muted-foreground uppercase">{format.dateTime(match.kickoffAt, { month: "short" })}</span>
              </span>
              <div className="min-w-0 flex-1 space-y-1">
                <CompetitionLabel match={match} short />
                <Link href={`/matchs/${match.id}`} prefetch={false} className="flex items-center gap-2 text-[15px] font-semibold hover:underline">
                  <TeamCrest name={home.name} logo={home.logo} className="size-5" />
                  <span className="truncate">{home.isPsg ? "PSG" : home.name}</span>
                  <span className="shrink-0 text-muted-foreground tabular-nums">{played ? `${home.score} – ${away.score}` : "–"}</span>
                  <span className="truncate">{away.isPsg ? "PSG" : away.name}</span>
                  <TeamCrest name={away.name} logo={away.logo} className="size-5" />
                </Link>
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[12px] text-muted-foreground">{format.dateTime(match.kickoffAt, { hour: "2-digit", minute: "2-digit" })}</span>
                  {match.status !== "scheduled" ? (
                    <StatusPill tone={match.status === "live" ? "ok" : match.status === "finished" ? "neutral" : "warn"}>{t(`statuses.${match.status}`)}</StatusPill>
                  ) : null}
                  <StatusPill tone={manual ? "brand" : "neutral"}>{t(manual ? "sourceManual" : "sourceSync")}</StatusPill>
                  {events ? <StatusPill tone="ok">{t("linkedEvents", { count: events })}</StatusPill> : null}
                </div>
              </div>
            </div>
            <MatchRowActions
              matchId={match.id}
              manual={manual}
              defaults={manual ? formValues(match) : null}
              option={
                match.kickoffAt >= now && !events
                  ? {
                      id: match.id,
                      label: matchTitle(match, "PSG"),
                      title: matchTitle(match, "PSG"),
                      kickoff: toLocalInput(kickoff),
                    }
                  : null
              }
            />
          </li>
        );
      })}
    </ul>
  );

  return (
    <>
      <AdminHeader
        title={tShell("sections.matches")}
        description={synced ? t("lastSync", { when: format.relativeTime(synced, now) }) : t("neverSynced")}
        actions={
          <>
            <MatchSyncButton />
            <NewMatchButton />
          </>
        }
      />
      <div className="space-y-8">
        <section className="space-y-3">
          <h2 className={adminLabel}>{t("upcoming")}</h2>
          {upcoming.length ? list(upcoming) : <p className="rounded-[14px] border border-dashed p-6 text-center text-sm text-muted-foreground">{t("noUpcoming")}</p>}
        </section>
        {recent.length ? (
          <section className="space-y-3">
            <h2 className={adminLabel}>{t("recent")}</h2>
            {list(recent)}
          </section>
        ) : null}
      </div>
    </>
  );
}

export default function AdminMatchesPage() {
  return (
    <Suspense fallback={<AdminListSkeleton />}>
      <Matches />
    </Suspense>
  );
}
