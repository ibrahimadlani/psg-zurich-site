"use client";

import { useEffect, useState } from "react";
import type { MatchView } from "@/components/matches/match-utils";
import { Scoreboard } from "@/components/matches/scoreboard";
import { Link } from "@/i18n/navigation";

const REFRESH_MS = 30_000;

/** Matches in progress, refreshed from the database every 30 s while visible (the server keeps it in sync). */
export function LiveMatches({ initial }: { initial: MatchView[] }) {
  const [matches, setMatches] = useState(initial);

  useEffect(() => {
    if (initial.length === 0) return;
    const refresh = async () => {
      if (document.hidden) return;
      const response = await fetch("/api/v1/matches/live", { cache: "no-store" }).catch(() => null);
      if (!response?.ok) return;
      const { data } = (await response.json()) as { data: MatchView[] };
      setMatches(data);
    };
    const timer = setInterval(refresh, REFRESH_MS);
    // Back on the tab: catch up at once instead of waiting for the next tick.
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [initial.length]);

  if (matches.length === 0) return null;
  return (
    <div className="space-y-4">
      {matches.map((match) => (
        <Link key={match.id} href={`/matches/${match.id}`} className="block transition-opacity hover:opacity-90">
          <Scoreboard match={match} />
        </Link>
      ))}
    </div>
  );
}
