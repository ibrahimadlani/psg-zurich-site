import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/*
 * The two matches that are more than a match: Le Classique (against Marseille) and the Paris
 * derby (against Paris FC). They get an outline in both clubs' colours with a glint going round,
 * and a badge (styles in globals.css, .rivalry-*).
 */

export type Rivalry = "classique" | "derby";

export function rivalryOf(match: { opponent: string }): Rivalry | null {
  if (/marseille/i.test(match.opponent)) return "classique";
  if (/^paris\s*f\.?\s*c\.?$/i.test(match.opponent.trim())) return "derby";
  return null;
}

/**
 * Classes for a card: the outline in both clubs' colours, Paris's on the side Paris stands
 * (`psg`: left/right on a scoreboard, top/bottom in a list row), with a glint going round.
 */
export const rivalryFrame = (rivalry: Rivalry | null, psg: "left" | "right" | "top" | "bottom") =>
  rivalry ? cn("rivalry-frame", `rivalry-${rivalry}`, `rivalry-psg-${psg}`) : "";

/** A club's mark: a small disc of its shirt (cloth and centre band). */
function ClubMark({ club, x }: { club: Club; x: number }) {
  const cloth = CLOTH[club];
  const id = `mark-${club}`;
  return (
    <g>
      <clipPath id={id}>
        <circle cx={x} cy="6" r="5" />
      </clipPath>
      <g clipPath={`url(#${id})`}>
        <rect x={x - 5} y="1" width="10" height="10" fill={cloth.base} />
        {cloth.edge ? <rect x={x - 2.4} y="1" width="4.8" height="10" fill={cloth.edge} /> : null}
        <rect x={x - (cloth.edge ? 1.5 : 1.8)} y="1" width={cloth.edge ? 3 : 3.6} height="10" fill={cloth.band} />
      </g>
      {/* A thin dark ring keeps the two discs apart where they overlap. */}
      <circle cx={x} cy="6" r="5.5" fill="none" stroke="#0c1018" strokeWidth="1" />
    </g>
  );
}

/** "Le Classique" / "Paris derby": a dark chip with both clubs' marks, ringed in their colours. */
export function RivalryBadge({ rivalry, size = "sm", className }: { rivalry: Rivalry; size?: "sm" | "md"; className?: string }) {
  const t = useTranslations("Matches.rivalry");
  return (
    <span
      title={t(`${rivalry}Long`)}
      className={cn(
        "rivalry-badge relative inline-flex shrink-0 items-center overflow-hidden rounded-full font-wide font-semibold tracking-[0.1em] whitespace-nowrap text-white uppercase",
        size === "md" ? "gap-2 py-[5px] pr-3 pl-1.5 text-[10px]" : "gap-1.5 py-[3px] pr-2 pl-1 text-[9px]",
        `rivalry-badge-${rivalry}`,
        className,
      )}
    >
      <svg viewBox="-0.5 0 19 12" aria-hidden className={cn("shrink-0", size === "md" ? "h-3.5" : "h-3")}>
        <ClubMark club={rivalry === "classique" ? "marseille" : "parisfc"} x={12} />
        <ClubMark club="psg" x={6} />
      </svg>
      {t(rivalry)}
    </span>
  );
}

type Club = "psg" | "marseille" | "parisfc";

/** Each club's colours: the ribbon's cloth and its centre band (with the band's edges). */
const CLOTH: Record<Club, { base: string; band: string; edge: string | null }> = {
  psg: { base: "#004170", band: "#da291c", edge: "#fff" },
  marseille: { base: "#fff", band: "#2faee0", edge: null },
  parisfc: { base: "#1b2d5a", band: "#8ccff2", edge: null },
};

/**
 * A bookmark ribbon in a club's colours, hanging from the card's top edge (folded over it); it
 * drops in when the page opens.
 */
export function RivalryRibbon({ club, side, delay = 0 }: { club: Club; side: "left" | "right"; delay?: number }) {
  const cloth = CLOTH[club];
  const id = `ribbon-${club}-${side}`;
  return (
    <span
      aria-hidden
      className={cn("rivalry-ribbon pointer-events-none absolute -top-[7px] z-10 w-[22px] sm:w-[28px]", side === "left" ? "left-5 sm:left-7" : "right-5 sm:right-7")}
      style={{ animationDelay: `${delay}ms` }}
    >
      <svg viewBox="0 -7 28 87" className="block h-auto w-full overflow-visible">
        <defs>
          <linearGradient id={`${id}-shade`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#fff" stopOpacity="0.18" />
            <stop offset="0.45" stopColor="#fff" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.22" />
          </linearGradient>
          <clipPath id={`${id}-clip`}>
            <path d="M0 0 H28 V80 L14 69 L0 80 Z" />
          </clipPath>
        </defs>
        {/* The part folded over the edge, in the shadow. */}
        <path d="M1.5 -7 H26.5 L28 0 H0 Z" fill={cloth.base} />
        <path d="M1.5 -7 H26.5 L28 0 H0 Z" fill="#000" fillOpacity="0.35" />
        <g clipPath={`url(#${id}-clip)`}>
          <rect x="0" y="0" width="28" height="80" fill={cloth.base} />
          {cloth.edge ? <rect x="8" y="0" width="12" height="80" fill={cloth.edge} /> : null}
          <rect x={cloth.edge ? 10 : 9} y="0" width={cloth.edge ? 8 : 10} height="80" fill={cloth.band} />
          <rect x="0" y="0" width="28" height="80" fill={`url(#${id}-shade)`} />
          <rect x="0" y="0" width="28" height="3" fill="#000" fillOpacity="0.25" />
        </g>
      </svg>
    </span>
  );
}

/** Which club colours a team wears on its ribbon. */
export function ribbonClub(team: { isPsg: boolean }, rivalry: Rivalry): Club {
  if (team.isPsg) return "psg";
  return rivalry === "classique" ? "marseille" : "parisfc";
}
