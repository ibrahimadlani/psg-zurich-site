import { ShortName } from "@/components/matches/short-name";
import { TeamCrest } from "@/components/matches/team-crest";
import { cn } from "@/lib/utils";

type LinkedMatch = { opponent: string; opponentLogo: string | null; venue: "home" | "away" | "neutral" };

/**
 * The match an event goes with: « [crest] PSG – Barça [crest] », home side first. On phones,
 * just the two crests (the names stay for screen readers).
 */
export function MatchBadge({ match, className }: { match: LinkedMatch; className?: string }) {
  const psg = { name: "PSG", logo: "/brand/psg-crest.svg" };
  const opponent = { name: match.opponent, logo: match.opponentLogo };
  const [home, away] = match.venue === "away" ? [opponent, psg] : [psg, opponent];
  return (
    <span
      className={cn(
        "inline-flex h-6 max-w-full items-center gap-1.5 rounded-full px-2 text-[12px] font-semibold whitespace-nowrap",
        "bg-foreground/[0.06] text-foreground",
        className,
      )}
    >
      <TeamCrest name={home.name} logo={home.logo} className="size-4" />
      <span className="max-sm:sr-only">
        <ShortName name={home.name} />
      </span>
      <span aria-hidden className="text-muted-foreground">
        –
      </span>
      <span className="max-w-28 truncate max-sm:sr-only">{away.name}</span>
      <TeamCrest name={away.name} logo={away.logo} className="size-4" />
    </span>
  );
}
