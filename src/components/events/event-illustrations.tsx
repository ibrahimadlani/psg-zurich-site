/*
 * Flat illustrations of the club's kinds of events (showcase of /events for visitors).
 * Drawn on PSG blue with white and red only, so they sit well in both themes.
 */

const W = "#fff";
const R = "var(--color-psg-red)";
const B = "var(--color-psg-blue)";
/** Darker blue for the shapes in the background. */
const D = "#062848";

function Frame({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <svg viewBox="0 0 320 200" role="img" aria-label={label} className="block size-full">
      <rect width="320" height="200" fill={B} />
      {/* Same diagonal hatching as the site background. */}
      <g stroke={W} strokeOpacity="0.06" strokeWidth="1">
        {Array.from({ length: 24 }, (_, index) => (
          <line key={index} x1={index * 18 - 60} y1="200" x2={index * 18 + 140} y2="0" />
        ))}
      </g>
      {children}
    </svg>
  );
}

/** A big screen with the match on, the crowd in front, one scarf in the air. */
export function WatchPartyIllustration({ label }: { label: string }) {
  return (
    <Frame label={label}>
      <rect x="70" y="30" width="180" height="104" rx="8" fill={D} stroke={W} strokeWidth="3" />
      <g stroke={W} strokeOpacity="0.55" strokeWidth="1.5" fill="none">
        <rect x="84" y="44" width="152" height="76" rx="2" />
        <line x1="160" y1="44" x2="160" y2="120" />
        <circle cx="160" cy="82" r="13" />
        <rect x="84" y="66" width="16" height="32" />
        <rect x="220" y="66" width="16" height="32" />
      </g>
      <circle cx="184" cy="74" r="5" fill={W} />
      <rect x="150" y="134" width="20" height="10" fill={W} />
      {/* Crowd */}
      <g fill={D}>
        {[46, 92, 138, 184, 230, 276].map((x, index) => (
          <g key={x} transform={`translate(${x} ${index % 2 ? 150 : 156})`}>
            <circle r="13" />
            <rect x="-22" y="12" width="44" height="40" rx="18" />
          </g>
        ))}
      </g>
      {/* Scarf held up above the crowd, beside the screen */}
      <g transform="rotate(-10 284 112)">
        <line x1="258" y1="136" x2="258" y2="114" stroke={D} strokeWidth="6" strokeLinecap="round" />
        <line x1="310" y1="136" x2="310" y2="114" stroke={D} strokeWidth="6" strokeLinecap="round" />
        <rect x="254" y="104" width="60" height="12" rx="2" fill={R} />
        <rect x="254" y="104" width="60" height="4" fill={W} fillOpacity="0.9" />
      </g>
    </Frame>
  );
}

/** The supporters' coach on its way, flag out of the window. */
export function AwayTripIllustration({ label }: { label: string }) {
  return (
    <Frame label={label}>
      <g stroke={W} strokeOpacity="0.35" strokeWidth="3" strokeLinecap="round" strokeDasharray="18 16">
        <line x1="0" y1="176" x2="320" y2="176" />
      </g>
      <g strokeLinecap="round" stroke={W} strokeOpacity="0.4" strokeWidth="3">
        <line x1="22" y1="96" x2="48" y2="96" />
        <line x1="12" y1="112" x2="44" y2="112" />
        <line x1="26" y1="128" x2="46" y2="128" />
      </g>
      <rect x="60" y="62" width="200" height="94" rx="14" fill={W} />
      <path d="M232 62h14a14 14 0 0 1 14 14v42h-28z" fill={D} opacity="0.12" />
      <rect x="60" y="124" width="200" height="10" fill={R} />
      <g fill={B}>
        {[74, 110, 146, 182].map((x) => (
          <rect key={x} x={x} y="76" width="28" height="34" rx="4" />
        ))}
        <rect x="222" y="76" width="30" height="40" rx="5" />
      </g>
      {/* Flag out of the window */}
      <line x1="118" y1="78" x2="118" y2="34" stroke={W} strokeWidth="3" strokeLinecap="round" />
      <path d="M118 34h38l-8 10 8 10h-38z" fill={R} />
      <rect x="118" y="34" width="12" height="20" fill={B} />
      <g fill={D}>
        <circle cx="100" cy="158" r="16" />
        <circle cx="222" cy="158" r="16" />
      </g>
      <g fill={W}>
        <circle cx="100" cy="158" r="6" />
        <circle cx="222" cy="158" r="6" />
      </g>
      <rect x="252" y="128" width="12" height="8" rx="2" fill="#ffd21f" />
    </Frame>
  );
}

/** A goal, a ball on its way in, two cones: the members' match. */
export function MembersMatchIllustration({ label }: { label: string }) {
  return (
    <Frame label={label}>
      <path d="M0 170 Q160 150 320 170 V200 H0z" fill={D} />
      <g stroke={W} strokeOpacity="0.3" strokeWidth="1">
        {Array.from({ length: 11 }, (_, index) => (
          <line key={`v${index}`} x1={96 + index * 13} y1="58" x2={104 + index * 11} y2="150" />
        ))}
        {Array.from({ length: 7 }, (_, index) => (
          <line key={`h${index}`} x1="96" y1={58 + index * 14} x2="226" y2={58 + index * 14} />
        ))}
      </g>
      <path d="M86 156V48h150v108" fill="none" stroke={W} strokeWidth="6" strokeLinejoin="round" />
      {/* Ball */}
      <g transform="translate(196 112)">
        <circle r="18" fill={W} />
        <path d="M0-7l6.7 4.9-2.6 7.9h-8.2l-2.6-7.9z" fill={D} />
        <g stroke={D} strokeWidth="1.5">
          <line x1="0" y1="-7" x2="0" y2="-17" />
          <line x1="6.7" y1="-2.1" x2="16" y2="-6" />
          <line x1="4.1" y1="5.8" x2="10" y2="14" />
          <line x1="-4.1" y1="5.8" x2="-10" y2="14" />
          <line x1="-6.7" y1="-2.1" x2="-16" y2="-6" />
        </g>
      </g>
      <g stroke={W} strokeOpacity="0.5" strokeWidth="3" strokeLinecap="round">
        <line x1="236" y1="128" x2="262" y2="138" />
        <line x1="240" y1="112" x2="272" y2="114" />
      </g>
      {[40, 286].map((x) => (
        <g key={x} transform={`translate(${x} 150)`}>
          <path d="M-6-26h12l8 26h-28z" fill={R} />
          <rect x="-5" y="-16" width="10" height="5" fill={W} />
          <rect x="-16" y="0" width="32" height="5" rx="2" fill={R} />
        </g>
      ))}
    </Frame>
  );
}

/** Two glasses raised under a red-white-blue bunting: the club's evenings. */
export function SocialIllustration({ label }: { label: string }) {
  const flags = [R, W, B, R, W, B, R, W];
  return (
    <Frame label={label}>
      <path d="M0 10 Q160 50 320 10" fill="none" stroke={W} strokeOpacity="0.5" strokeWidth="1.5" />
      {flags.map((color, index) => {
        const x = 26 + index * 38;
        // Point of the quadratic curve above (x goes linearly from 0 to 320).
        const t = x / 320;
        const y = 10 + 2 * t * (1 - t) * 40;
        return (
          <path
            key={index}
            d={`M${x - 11} ${y - 2}h22l-11 20z`}
            fill={color === B ? D : color}
            stroke={color === B ? W : "none"}
            strokeOpacity="0.4"
          />
        );
      })}
      <g transform="rotate(-14 130 124)">
        <path d="M108 86h44l-5 74h-34z" fill={W} />
        <path d="M110 100h40l-4 58h-30z" fill="#ffd21f" />
        <path d="M108 86h44v10c-8 4-14-4-22 0s-14 4-22 0z" fill={W} />
      </g>
      <g transform="rotate(14 196 124)">
        <path d="M174 86h44l-5 74h-34z" fill={W} />
        <path d="M176 100h40l-4 58h-30z" fill={R} />
        <path d="M174 86h44v10c-8 4-14-4-22 0s-14 4-22 0z" fill={W} />
      </g>
      <g stroke={W} strokeWidth="3" strokeLinecap="round">
        <line x1="163" y1="74" x2="163" y2="62" />
        <line x1="148" y1="78" x2="140" y2="68" />
        <line x1="178" y1="78" x2="186" y2="68" />
      </g>
      <path d="M0 184h320v16H0z" fill={D} />
    </Frame>
  );
}
