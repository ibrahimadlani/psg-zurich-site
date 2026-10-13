import { and, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { asideCard } from "@/components/matches/match-utils";
import { PredictionForm, PredictionPreview } from "@/components/matches/prediction-form";
import { LockedCard } from "@/components/membership/locked-card";
import { InfoBubble } from "@/components/ui/info-bubble";
import { PredictionRules } from "@/components/matches/prediction-rules";
import { db } from "@/db";
import { predictions } from "@/db/schema";
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

type Props = { match: Match; access: Access; memberId: string | null };

/**
 * "Prediction" of a match: a section title like "Club events", then the card — the form until
 * kick-off (accepted members), then the member's prediction, their points and the community split.
 */
export async function PredictionCard(props: Props) {
  const tp = await getTranslations("Predictions");
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-wide text-xs font-semibold tracking-[0.08em] uppercase">{tp("title")}</h2>
        {/* How predictions work, out of the way: in a bubble. */}
        <InfoBubble label={tp("infoLabel")}>
          <p className="mb-3 text-[13px] leading-normal text-pretty text-muted-foreground">{tp("infoBody")}</p>
          <PredictionRules />
        </InfoBubble>
      </div>
      <PredictionCardBody {...props} />
    </section>
  );
}

async function PredictionCardBody({
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
          kickoffAt={match.kickoffAt.toISOString()}
        />
      </div>
    );
  }

  // Not a member yet: the card is there, locked, with the way in.
  if (open && access !== "member") {
    return (
      <LockedCard
        access={access === "guest" ? "guest" : "pending"}
        feature="predictions"
        next={`/matchs/${match.id}`}
        preview={<PredictionPreview opponent={match.opponent} psgHome={match.venue !== "away"} />}
      />
    );
  }

  return (
    <div className={asideCard}>
      <div className="flex flex-col gap-1.5">
        <p className="text-sm leading-normal text-pretty text-muted-foreground">
          {open
            ? tp("openHint")
            : mine?.points != null
              ? tp("yourPoints", { count: mine.points })
              : tp("closedHint")}
        </p>
      </div>
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
