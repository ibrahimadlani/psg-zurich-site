import { and, asc, desc, eq, gte, inArray, isNull } from "drizzle-orm";
import { getFormatter, getTranslations } from "next-intl/server";
import { EventAdminActions, MatchSyncButton } from "@/components/admin/event-admin-row";
import { EventForm, type EventFormValues } from "@/components/admin/event-form";
import { ManualMatchActions, MatchForm, type MatchFormValues } from "@/components/admin/match-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { attendance, events, matches, members } from "@/db/schema";
import { displayName } from "@/lib/leaderboard";
import { matchScore, matchTitle } from "@/lib/matches";

// datetime-local value in Zurich time (the club's), from a UTC date.
const toLocalInput = (date: Date | null) =>
  date
    ? new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Zurich", dateStyle: "short", timeStyle: "short" })
        .format(date)
        .replace(" ", "T")
    : "";

/** Matches sync + club events (create, edit, delete, attendees). */
export async function EventsAdmin() {
  const [t, tEvents, tMatches, format] = await Promise.all([
    getTranslations("AdminEvents"),
    getTranslations("Events"),
    getTranslations("AdminMatches"),
    getFormatter(),
  ]);
  const now = new Date();
  const [upcomingMatches, rows] = await Promise.all([
    db.select().from(matches).where(gte(matches.kickoffAt, new Date(now.getTime() - 3 * 60 * 60 * 1000))).orderBy(asc(matches.kickoffAt)).limit(30),
    db.select().from(events).orderBy(desc(events.startsAt)).limit(20),
  ]);
  // Matches entered by hand (no football-data.org id), latest first.
  const manualMatches = await db.select().from(matches).where(isNull(matches.externalId)).orderBy(desc(matches.kickoffAt)).limit(20);
  const matchOptions = upcomingMatches.map((match) => ({
    id: match.id,
    label: `${format.dateTime(match.kickoffAt, { day: "numeric", month: "short" })} · ${matchTitle(match, "PSG")} (${match.competition})`,
  }));

  const signups = rows.length
    ? await db
        .select({ eventId: attendance.eventId, status: attendance.status, firstName: members.firstName, lastName: members.lastName })
        .from(attendance)
        .innerJoin(members, eq(members.id, attendance.memberId))
        .where(and(inArray(attendance.eventId, rows.map((row) => row.id)), inArray(attendance.status, ["registered", "waitlisted"])))
        .orderBy(asc(attendance.createdAt))
    : [];

  return (
    <Card id="evenements">
      <CardHeader>
        <CardTitle>{t("cardTitle")}</CardTitle>
        <CardDescription>{t("cardDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <MatchSyncButton />
        <details className="rounded-lg border p-3">
          <summary className="cursor-pointer text-sm font-medium">{tMatches("new")}</summary>
          <p className="mt-2 text-xs text-muted-foreground">{tMatches("newHint")}</p>
          <div className="mt-3">
            <MatchForm />
          </div>
        </details>
        {manualMatches.length > 0 ? (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">{tMatches("listTitle")}</h3>
            <ul className="divide-y rounded-lg border">
              {manualMatches.map((match) => {
                const defaults: MatchFormValues = {
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
                  regulationPsgScore:
                    match.regulationPsgScore !== null && match.regulationPsgScore !== match.psgScore ? String(match.regulationPsgScore) : "",
                  regulationOpponentScore:
                    match.regulationOpponentScore !== null && match.regulationOpponentScore !== match.opponentScore
                      ? String(match.regulationOpponentScore)
                      : "",
                  penaltyPsgScore: match.penaltyPsgScore?.toString() ?? "",
                  penaltyOpponentScore: match.penaltyOpponentScore?.toString() ?? "",
                };
                return (
                  <li key={match.id} className="space-y-2 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{tMatches(`statuses.${match.status}`)}</Badge>
                      <span className="font-semibold">
                        {matchTitle(match, "PSG")}
                        {matchScore(match) ? ` ${matchScore(match)}` : ""}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {match.competition} · {format.dateTime(match.kickoffAt, { dateStyle: "medium", timeStyle: "short" })}
                      </span>
                    </div>
                    <ManualMatchActions matchId={match.id} defaults={defaults} />
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
        <details className="rounded-lg border p-3">
          <summary className="cursor-pointer text-sm font-medium">{t("new")}</summary>
          <div className="mt-3">
            <EventForm matchOptions={matchOptions} />
          </div>
        </details>
        {rows.length > 0 ? (
          <ul className="divide-y rounded-lg border">
            {rows.map((event) => {
              const people = signups.filter((signup) => signup.eventId === event.id);
              const registered = people.filter((person) => person.status === "registered");
              const waitlisted = people.filter((person) => person.status === "waitlisted");
              const defaults: EventFormValues = {
                type: event.type,
                title: event.title,
                description: event.description ?? "",
                matchId: event.matchId ?? "",
                location: event.location ?? "",
                startsAt: toLocalInput(event.startsAt),
                endsAt: toLocalInput(event.endsAt),
                capacity: event.capacity?.toString() ?? "",
                membersOnly: event.membersOnly,
              };
              return (
                <li key={event.id} className="space-y-2 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{tEvents(`types.${event.type}`)}</Badge>
                    <span className="font-semibold">{event.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {format.dateTime(event.startsAt, { dateStyle: "medium", timeStyle: "short" })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t("signups", { registered: registered.length, capacity: event.capacity ?? "∞", waitlisted: waitlisted.length })}
                  </p>
                  {people.length > 0 ? (
                    <details className="text-sm">
                      <summary className="cursor-pointer text-muted-foreground">{t("attendees")}</summary>
                      <ul className="mt-1 list-inside list-disc">
                        {registered.map((person, index) => (
                          <li key={`r${index}`}>{displayName(person.firstName, person.lastName)}</li>
                        ))}
                        {waitlisted.map((person, index) => (
                          <li key={`w${index}`} className="text-muted-foreground">
                            {displayName(person.firstName, person.lastName)} · {t("onWaitlist")}
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                  <EventAdminActions eventId={event.id} defaults={defaults} matchOptions={matchOptions} />
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        )}
      </CardContent>
    </Card>
  );
}
