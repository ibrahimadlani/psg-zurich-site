/*
 * Illustrations of the visitors' landing page, in the club colours only (PSG blue, white, red),
 * same conventions as components/events/event-illustrations.tsx. Layers that move with the
 * scroll read --p (0 → 1, set by <Parallax>); the motion classes are in globals.css and stop
 * when reduced motion is asked for.
 */

const W = "#fff";
const R = "var(--color-psg-red)";
const B = "var(--color-psg-blue)";
/** Darker blue for the shapes in the background. */
const D = "#062848";
/** Darkest blue, for what stands in front. */
const N = "#021a30";

/** A layer that drifts down by `depth` px over the hero's scroll (far layers drift most). */
const layer = (depth: number) => ({ transform: `translate3d(0, calc(var(--p, 0) * ${depth}px), 0)` });

// Old-town houses along the Limmat: [x, width, height]; roofs pitched, a few windows lit.
const HOUSES: [number, number, number][] = [
  [-4, 40, 58], [36, 34, 76], [70, 44, 50], [114, 30, 68], [144, 40, 56], [184, 34, 84], [218, 42, 60], [260, 36, 72],
  [296, 34, 54], [362, 30, 66], [470, 34, 60], [534, 34, 70], [568, 40, 52], [608, 36, 64], [644, 42, 50], [686, 34, 72], [720, 46, 56],
  [766, 38, 66],
];

/**
 * Hero: Zurich by night from the lake shore — St. Peter, the Grossmünster's twin towers, the
 * Fraumünster's spire, the Uetliberg and, far behind, the Eiffel Tower. In front, a supporter
 * on the quay, fist up, the flag flying.
 */
export function HeroSkyline({ label }: { label: string }) {
  return (
    <svg viewBox="0 0 600 520" role="img" aria-label={label} className="block size-full overflow-visible">
      <defs>
        <clipPath id="hero-flag">
          <path d="M200 172 C 240 158, 282 188, 340 170 L 330 252 C 272 268, 232 238, 188 252 Z" />
        </clipPath>
        <linearGradient id="hero-lake" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={W} stopOpacity="0.1" />
          <stop offset="1" stopColor={W} stopOpacity="0" />
        </linearGradient>
        <linearGradient id="hero-edge" x1="0" y1="0" x2="90" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={W} stopOpacity="0" />
          <stop offset="1" stopColor={W} />
        </linearGradient>
        <mask id="hero-fade" maskUnits="userSpaceOnUse" x="-2000" y="-200" width="4600" height="900">
          <rect x="-2000" y="-200" width="4600" height="900" fill="url(#hero-edge)" />
        </mask>
        <linearGradient id="hero-shore" x1="-600" y1="0" x2="40" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={W} stopOpacity="0" />
          <stop offset="1" stopColor={W} stopOpacity="0.3" />
        </linearGradient>
        <radialGradient id="hero-moon" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0.55" stopColor={W} stopOpacity="0.16" />
          <stop offset="1" stopColor={W} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Sky: moon and stars */}
      <g style={layer(90)}>
        <circle cx="468" cy="96" r="78" fill="url(#hero-moon)" />
        <circle cx="468" cy="96" r="34" fill={W} fillOpacity="0.9" />
        <circle cx="456" cy="88" r="34" fill={B} fillOpacity="0.18" />
        {[
          [60, 60], [140, 34], [228, 92], [300, 40], [372, 118], [560, 48], [530, 170], [96, 140], [404, 30],
        ].map(([x, y], index) => (
          <circle key={index} cx={x} cy={y} r={index % 3 ? 1.6 : 2.4} fill={W} className="landing-twinkle" style={{ animationDelay: `${index * 0.45}s` }} />
        ))}
      </g>

      <g mask="url(#hero-fade)">
        {/* Far: the Uetliberg and Paris on the horizon */}
        <g style={layer(70)}>
          <path d="M0 318 C 70 284 150 276 236 296 S 390 262 470 280 S 560 300 600 288 S 780 300 900 290 V 372 H 0 Z" fill={D} fillOpacity="0.6" />
          <g stroke={W} strokeOpacity="0.4" strokeWidth="1.6" fill="none" strokeLinejoin="round">
            <path d="M556 300 Q 568 256 572 216 L 574 186 L 576 168 L 578 186 L 580 216 Q 584 256 596 300" />
            <path d="M564 300 Q 576 280 588 300" />
            <line x1="565" y1="262" x2="587" y2="262" />
            <line x1="570" y1="226" x2="582" y2="226" />
            <line x1="576" y1="168" x2="576" y2="154" />
          </g>
        </g>

        {/* Middle: the old town */}
        <g style={layer(36)} fill={D}>
          {HOUSES.map(([x, w, h], index) => (
            <g key={x}>
              <path d={`M${x} 362 V ${362 - h} L ${x + w / 2} ${362 - h - 16} L ${x + w} ${362 - h} V 362 Z`} />
              {index % 2 ? <rect x={x + w / 2 - 4} y={362 - h + 14} width="6" height="8" rx="1" fill={W} fillOpacity="0.55" className="landing-window" style={{ animationDelay: `${index * 0.7}s` }} /> : null}
              {index % 3 === 0 ? <rect x={x + 8} y={362 - h + 30} width="6" height="8" rx="1" fill={W} fillOpacity="0.35" /> : null}
            </g>
          ))}
          {/* St. Peter: the big clock */}
          <rect x="333" y="246" width="26" height="116" />
          <path d="M330 248 L 346 196 L 362 248 Z" />
          <circle cx="346" cy="268" r="8" fill="none" stroke={W} strokeOpacity="0.7" strokeWidth="1.6" />
          <path d="M346 268 V 263 M346 268 H 350" stroke={W} strokeOpacity="0.7" strokeWidth="1.4" strokeLinecap="round" />
          {/* Grossmünster: twin towers with their domed caps */}
          {[397, 437].map((x) => (
            <g key={x}>
              <rect x={x} y="236" width="26" height="126" />
              <path d={`M${x - 2} 238 Q ${x + 13} 206 ${x + 28} 238 Z`} />
              <line x1={x + 13} y1="216" x2={x + 13} y2="198" stroke={D} strokeWidth="2.4" />
              <circle cx={x + 13} cy="197" r="2.6" />
              <rect x={x + 9} y="252" width="8" height="14" rx="4" fill={W} fillOpacity="0.45" />
              <rect x={x + 9} y="282" width="8" height="14" rx="4" fill={W} fillOpacity="0.25" />
            </g>
          ))}
          <rect x="423" y="290" width="14" height="72" />
          <rect x="380" y="316" width="100" height="46" />
          <path d="M376 318 L 430 290 L 484 318 Z" />
          {/* Fraumünster: the slender green spire */}
          <rect x="507" y="262" width="18" height="100" />
          <path d="M504 264 L 516 186 L 528 264 Z" />
          <rect x="490" y="320" width="56" height="42" />
          <rect x="512" y="276" width="8" height="12" rx="4" fill={W} fillOpacity="0.45" />
        </g>

        {/* The lake: shimmer and reflections */}
        <rect x="0" y="362" width="900" height="110" fill="url(#hero-lake)" />
      </g>
      <line x1="-600" y1="362.5" x2="2600" y2="362.5" stroke="url(#hero-shore)" strokeWidth="1.5" />
      <g fill={W} fillOpacity="0.08">
        <rect x="333" y="366" width="26" height="40" />
        <rect x="397" y="366" width="26" height="56" />
        <rect x="437" y="366" width="26" height="56" />
        <rect x="507" y="366" width="18" height="44" />
      </g>
      <g stroke={W} strokeOpacity="0.28" strokeWidth="2" strokeLinecap="round" className="landing-drift">
        {([
          [30, 384, 60], [150, 398, 40], [260, 380, 80], [420, 392, 54], [520, 410, 46], [90, 420, 50], [330, 430, 70], [480, 444, 40],
        ] as const).map(([x, y, w]) => (
          <line key={`${x}-${y}`} x1={x} y1={y} x2={x + w} y2={y} />
        ))}
      </g>
      {/* Moon's path on the water */}
      <g fill={W} fillOpacity="0.35">
        <rect x="448" y="376" width="40" height="2.5" rx="1.25" />
        <rect x="456" y="388" width="26" height="2.5" rx="1.25" />
        <rect x="462" y="400" width="14" height="2.5" rx="1.25" />
      </g>

      {/* Front: the quay, a lamp, the supporter and the flag */}
      <g style={layer(8)}>
        <path d="M-2000 470 H 2600 V 640 H -2000 Z" fill={N} />
        <line x1="-2000" y1="470" x2="2600" y2="470" stroke={W} strokeOpacity="0.18" strokeWidth="2" />
        <g>
          <line x1="560" y1="470" x2="560" y2="384" stroke={N} strokeWidth="5" strokeLinecap="round" />
          <path d="M552 384 H 568 L 564 374 H 556 Z" fill={N} />
          <circle cx="560" cy="388" r="22" fill={W} fillOpacity="0.1" />
          <circle cx="560" cy="388" r="5" fill={W} />
        </g>

        {/* The pole first, the flag on it */}
        <line x1="155" y1="470" x2="200" y2="166" stroke={N} strokeWidth="5" strokeLinecap="round" />
        <circle cx="200.5" cy="164" r="4.5" fill={W} />
        <g className="landing-flag" style={{ transformOrigin: "200px 212px", transformBox: "view-box" }}>
          <g clipPath="url(#hero-flag)">
            <rect x="180" y="150" width="68" height="130" fill={D} />
            <rect x="248" y="150" width="6" height="130" fill={W} />
            <rect x="254" y="150" width="30" height="130" fill={R} />
            <rect x="284" y="150" width="6" height="130" fill={W} />
            <rect x="290" y="150" width="60" height="130" fill={D} />
            {/* Folds */}
            <path d="M228 150 C 236 190, 226 230, 236 280" stroke={W} strokeOpacity="0.14" strokeWidth="8" fill="none" />
            <path d="M310 150 C 318 190, 306 230, 316 280" stroke={N} strokeOpacity="0.35" strokeWidth="10" fill="none" />
          </g>
          <path d="M200 172 C 240 158, 282 188, 340 170 L 330 252 C 272 268, 232 238, 188 252 Z" fill="none" stroke={W} strokeOpacity="0.85" strokeWidth="2" />
        </g>

        {/* The supporter, from behind */}
        <g fill={N}>
          <rect x="103" y="426" width="16" height="46" rx="6" />
          <rect x="123" y="426" width="16" height="46" rx="6" />
          <path d="M96 378 Q 121 364 146 378 L 150 434 Q 121 440 92 434 Z" />
          <circle cx="121" cy="352" r="15" />
        </g>
        {/* The shirt's band, white-red-white */}
        <path d="M112 371 L 130 371 L 131 437 L 111 437 Z" fill={W} />
        <path d="M115 371 L 127 371 L 128 437 L 114 437 Z" fill={R} />
        {/* Scarf at the neck */}
        <rect x="106" y="364" width="30" height="7" rx="3" fill={R} />
        <rect x="106" y="364" width="30" height="2.5" rx="1.25" fill={W} />
        {/* Arms: one fist up, one on the pole */}
        <g stroke={N} strokeWidth="11" strokeLinecap="round" fill="none">
          <path d="M100 382 L 84 350 L 76 318" />
          <path d="M142 382 L 162 360 L 176 330" />
        </g>
        <circle cx="75" cy="313" r="7.5" fill={N} />
      </g>
    </svg>
  );
}

/** The association: the crest floating on the lake, the Alps behind, ripples spreading. */
export function CrestLake({ label }: { label: string }) {
  return (
    <svg viewBox="0 0 480 480" role="img" aria-label={label} className="block size-full">
      <defs>
        <linearGradient id="crest-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={W} stopOpacity="0.32" />
          <stop offset="1" stopColor={W} stopOpacity="0" />
        </linearGradient>
        <mask id="crest-reflection">
          <rect x="0" y="300" width="480" height="180" fill="url(#crest-fade)" />
        </mask>
      </defs>
      <rect width="480" height="480" fill={B} />
      <g stroke={W} strokeOpacity="0.06" strokeWidth="1">
        {Array.from({ length: 36 }, (_, index) => (
          <line key={index} x1={index * 20 - 240} y1="480" x2={index * 20 + 240} y2="0" />
        ))}
      </g>
      {/* The Alps, snow on top */}
      <path d="M0 300 L 70 220 L 110 252 L 180 160 L 240 236 L 290 190 L 360 262 L 420 206 L 480 260 V 300 Z" fill={D} />
      <g fill={W} fillOpacity="0.9">
        <path d="M160 186 L 180 160 L 200 186 L 190 182 L 180 192 L 170 180 Z" />
        <path d="M276 206 L 290 190 L 306 208 L 296 204 L 289 212 Z" />
        <path d="M406 222 L 420 206 L 434 222 L 425 219 L 419 226 Z" />
        <path d="M58 234 L 70 220 L 82 234 L 74 231 Z" />
      </g>
      <rect x="0" y="300" width="480" height="180" fill={D} fillOpacity="0.35" />
      <line x1="0" y1="300.5" x2="480" y2="300.5" stroke={W} strokeOpacity="0.3" strokeWidth="1.5" />
      {/* Ripples around the crest */}
      <g fill="none" stroke={W} strokeWidth="1.5">
        {[0, 1, 2].map((index) => (
          <ellipse key={index} cx="240" cy="318" rx="150" ry="34" strokeOpacity="0.5" className="landing-ripple" style={{ animationDelay: `${index * 1.3}s` }} />
        ))}
      </g>
      {/* The crest and its reflection */}
      <g className="landing-float">
        <image href="/brand/psg-crest.svg" x="160" y="134" width="160" height="160" />
      </g>
      <g mask="url(#crest-reflection)">
        <image href="/brand/psg-crest.svg" x="160" y="134" width="160" height="160" transform="translate(0 636) scale(1 -1)" opacity="0.7" />
      </g>
    </svg>
  );
}

/** The stand behind the final call: rows of fans (darker towards the front), scarves held up, flags. */
export function StandArt({ label }: { label: string }) {
  const rows = [
    { y: 112, fill: "#0b3a66" },
    { y: 140, fill: "#083159" },
    { y: 168, fill: D },
    { y: 196, fill: "#04213c" },
    { y: 224, fill: N },
  ];
  return (
    <svg viewBox="0 0 1200 260" preserveAspectRatio="xMidYMax slice" role="img" aria-label={label} className="block size-full">
      {/* The stand itself, so nothing behind shows between the fans. */}
      <rect x="-20" y="124" width="1240" height="140" fill="#0b3a66" />
      {rows.map(({ y, fill }, row) => (
        <g key={y} fill={fill}>
          {Array.from({ length: 52 }, (_, column) => {
            const x = column * 24 + (row % 2 ? 12 : 0) - 6;
            // Spread unevenly: a few scarves held up with both arms, a few fists, two flags at the back.
            const hash = (column * 73 + row * 151) % 29;
            const flag = row === 0 && column % 17 === 6;
            return (
              <g key={column}>
                {flag ? (
                  <g>
                    <line x1={x} y1={y + 4} x2={x + 6} y2={y - 70} stroke={fill} strokeWidth="3" />
                    <g className="landing-flag" style={{ transformOrigin: `${x + 6}px ${y - 50}px`, transformBox: "view-box", animationDelay: `${column * 0.2}s` }}>
                      <path d={`M${x + 6} ${y - 70} q 30 -8 62 2 l -4 42 q -30 -8 -62 -2 Z`} fill={W} />
                      <path d={`M${x + 27} ${y - 73} l 20 1 l -3 43 l -20 -2 Z`} fill={R} />
                    </g>
                  </g>
                ) : null}
                {hash === 0 ? (
                  <g>
                    <path d={`M${x - 9} ${y + 12} L ${x - 14} ${y - 18} M${x + 9} ${y + 12} L ${x + 14} ${y - 18}`} stroke={fill} strokeWidth="5" strokeLinecap="round" />
                    <rect x={x - 20} y={y - 26} width="40" height="9" rx="1.5" fill={R} />
                    <rect x={x - 20} y={y - 26} width="40" height="3" fill={W} />
                  </g>
                ) : hash === 7 || hash === 19 ? (
                  <g>
                    <path d={`M${x + 9} ${y + 12} L ${x + 13} ${y - 14}`} stroke={fill} strokeWidth="5" strokeLinecap="round" />
                    <circle cx={x + 13} cy={y - 16} r="4" />
                  </g>
                ) : null}
                <circle cx={x} cy={y} r="9" />
                <path d={`M${x - 13} ${y + 40} V ${y + 20} Q ${x - 13} ${y + 10} ${x} ${y + 10} Q ${x + 13} ${y + 10} ${x + 13} ${y + 20} V ${y + 40} Z`} />
              </g>
            );
          })}
        </g>
      ))}
    </svg>
  );
}
