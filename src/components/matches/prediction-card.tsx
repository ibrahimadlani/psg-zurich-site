import { and, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { PredictionForm } from "@/components/matches/prediction-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { predictions } from "@/db/schema";
import { Link } from "@/i18n/navigation";
import { isPredictionOpen, matchTitle, type Match } from "@/lib/matches";

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
 * Prediction card of a match: form until kick-off (active members), then the member's
 * prediction, points and the community split. `withMatch` names the match (event page).
 */
export async function PredictionCard({
  match,
  access,
  memberId,
  withMatch = false,
}: {
  match: Match;
  access: Access;
  memberId: string | null;
  withMatch?: boolean;
}) {
  const tp = await getTranslations("Predictions");
  const open = isPredictionOpen(match);
  const [[mine], stats] = await Promise.all([
    access === "member" && memberId
      ? db.select().from(predictions).where(and(eq(predictions.matchId, match.id), eq(predictions.memberId, memberId)))
      : Promise.resolve([]),
    open ? null : communityStats(match.id),
  ]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{tp("title")}</CardTitle>
        {withMatch ? (
          <Link href={`/matchs/${match.id}`} className="text-sm font-medium underline-offset-2 hover:underline">
            {matchTitle(match, "PSG")} · {match.competition}
          </Link>
        ) : null}
        <CardDescription>
          {open ? tp("openHint") : mine?.points != null ? tp("yourPoints", { count: mine.points }) : tp("closedHint")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {open && access === "member" ? (
          <PredictionForm
            matchId={match.id}
            psgHome={match.venue !== "away"}
            opponent={match.opponent}
            initial={mine ? { psgScore: mine.psgScore, opponentScore: mine.opponentScore } : null}
          />
        ) : null}
        {open && access === "guest" ? (
          <Link href="/connexion" prefetch={false} className="text-sm underline underline-offset-2">
            {tp("signIn")}
          </Link>
        ) : null}
        {open && access === "inactive" ? <p className="text-sm text-muted-foreground">{tp("membersOnly")}</p> : null}
        {!open && mine ? <p className="text-sm">{tp("yourPrediction", { psg: mine.psgScore, opponent: mine.opponentScore })}</p> : null}
        {stats && stats.total > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">{tp("community", { count: stats.total })}</p>
            <div className="flex h-2.5 overflow-hidden rounded-full bg-foreground/10">
              <span className="bg-emerald-600" style={{ width: `${(stats.win / stats.total) * 100}%` }} />
              <span className="bg-foreground/40" style={{ width: `${(stats.draw / stats.total) * 100}%` }} />
              <span className="bg-psg-red" style={{ width: `${(stats.loss / stats.total) * 100}%` }} />
            </div>
            <p className="flex justify-between text-xs text-muted-foreground">
              <span>{tp("win", { percent: Math.round((stats.win / stats.total) * 100) })}</span>
              <span>{tp("draw", { percent: Math.round((stats.draw / stats.total) * 100) })}</span>
              <span>{tp("loss", { percent: Math.round((stats.loss / stats.total) * 100) })}</span>
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
