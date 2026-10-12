import { and, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { asideCard } from "@/components/matches/match-utils";
import { PredictionForm } from "@/components/matches/prediction-form";
import { PredictionRules } from "@/components/matches/prediction-rules";
import { db } from "@/db";
import { predictions } from "@/db/schema";
import { inlineLinkClass } from "@/components/auth/auth-ui";
import { Link } from "@/i18n/navigation";
import { isPredictionOpen, type Match } from "@/lib/matches";

export type Access = "member" | "guest" | "inactive";

/** Distribution of the community's predictions (shown once predictions are closed). */
async function communityStats(matchId: string) {
  const rows = await db
    .select({ psg: predictions.psgScore, other: predictions.opponentScore })
    .from(predictions)
    .where(eq(predictions.matchId, matchId));
  const win = rows.filter((row) => row.psg > row.other).length;
  const draw = rows.filter((row) => row.psg === row.other).length;
  return { total: rows.length, win, draw, loss: rows.length - win - draw };
}

/**
 * Prediction card of a match: the form until kick-off (active members), then the member's
 * prediction, their points and the community split.
 */
export async function PredictionCard({
  match,
  access,
  memberId,
}: {
  match: Match;
  access: Access;
  memberId: string | null;
}) {
  const tp = await getTranslations("Predictions");
  const open = isPredictionOpen(match);
  const [[mine], stats] = await Promise.all([
    access === "member" && memberId
      ? db
          .select()
          .from(predictions)
          .where(
            and(
              eq(predictions.matchId, match.id),
              eq(predictions.memberId, memberId),
            ),
          )
      : Promise.resolve([]),
    open ? null : communityStats(match.id),
  ]);

  if (open && access === "member") {
    return (
      <div className={asideCard}>
        <PredictionForm
          matchId={match.id}
          psgHome={match.venue !== "away"}
          opponent={match.opponent}
          initial={
            mine
              ? { psgScore: mine.psgScore, opponentScore: mine.opponentScore }
              : null
          }
          rules={<PredictionRules />}
        />
      </div>
    );
  }

  if (open && access === "guest") {
    return (
      <div className={asideCard}>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-wide text-xs font-semibold tracking-[0.08em] uppercase">
            {tp("title")}
          </h2>
          <span
            aria-hidden
            className="font-narrow text-2xl leading-none font-extrabold text-foreground/15 tabular-nums italic"
          >
            ? – ?
          </span>
        </div>
        <p className="-mt-2 text-sm leading-normal text-pretty text-muted-foreground">
          {tp("guestHint")}
        </p>
        <div className="flex flex-col items-center gap-3">
          <Link
            href={`/connexion?suite=${encodeURIComponent(`/matchs/${match.id}`)}`}
            prefetch={false}
            className="inline-flex h-10 w-full items-center justify-center rounded-[8px] bg-segment font-wide text-[11px] font-semibold tracking-[0.06em] text-segment-foreground uppercase shadow-brand transition-opacity hover:opacity-90"
          >
            {tp("signIn")}
          </Link>
          <p className="text-[13px] text-muted-foreground">
            {tp.rich("notMember", {
              join: (chunks) => (
                <Link
                  href="/adhesion"
                  prefetch={false}
                  className={inlineLinkClass}
                >
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={asideCard}>
      <div className="flex flex-col gap-1.5">
        <h2 className="font-wide text-xs font-semibold tracking-[0.08em] uppercase">
          {tp("title")}
        </h2>
        <p className="text-sm leading-normal text-pretty text-muted-foreground">
          {open
            ? tp("openHint")
            : mine?.points != null
              ? tp("yourPoints", { count: mine.points })
              : tp("closedHint")}
        </p>
      </div>
      {open && access === "inactive" ? (
        <p className="text-sm text-muted-foreground">{tp("membersOnly")}</p>
      ) : null}
      {!open && mine ? (
        <p className="border-y py-4 text-center">
          <span className="block text-xs text-muted-foreground">
            {tp("yourPredictionLabel")}
          </span>
          <span className="font-narrow text-4xl font-extrabold tabular-nums italic">
            PSG {mine.psgScore} – {mine.opponentScore}
          </span>
        </p>
      ) : null}
      {stats && stats.total > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">
            {tp("community", { count: stats.total })}
          </p>
          <div className="flex h-2.5 overflow-hidden rounded-full bg-foreground/10">
            <span
              className="bg-ok"
              style={{ width: `${(stats.win / stats.total) * 100}%` }}
            />
            <span
              className="bg-foreground/40"
              style={{ width: `${(stats.draw / stats.total) * 100}%` }}
            />
            <span
              className="bg-psg-red"
              style={{ width: `${(stats.loss / stats.total) * 100}%` }}
            />
          </div>
          <p className="flex justify-between text-xs text-muted-foreground">
            <span>
              {tp("win", {
                percent: Math.round((stats.win / stats.total) * 100),
              })}
            </span>
            <span>
              {tp("draw", {
                percent: Math.round((stats.draw / stats.total) * 100),
              })}
            </span>
            <span>
              {tp("loss", {
                percent: Math.round((stats.loss / stats.total) * 100),
              })}
            </span>
          </p>
        </div>
      ) : null}
    </div>
  );
}
