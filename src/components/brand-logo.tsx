import Image from "next/image";
import { Link } from "@/i18n/navigation";

const trimToCaps = "[text-box:trim-both_cap_alphabetic]";

/**
 * Two neon-gold Champions League stars standing in for the umlaut of "Zürich". They sit in the space the
 * taller crest leaves above the text, so the logo keeps its height.
 */
function UclStars() {
  return (
    <span
      aria-hidden
      className="absolute bottom-full left-1/2 -mb-[0.03em] flex -translate-x-1/2 gap-[0.03em] text-[#ffd21f] drop-shadow-[0_0_2px_rgb(255_200_0/0.85)] dark:drop-shadow-[0_0_3px_rgb(255_205_30/0.95)]"
    >
      {[0, 1].map((star) => (
        <svg
          key={star}
          viewBox="0 0 24 24"
          className="size-[0.3em] fill-current"
        >
          <path d="M12 1.5l3.09 6.97 7.41.7-5.6 4.93 1.64 7.4L12 17.6l-6.54 3.9 1.64-7.4L1.5 9.17l7.41-.7z" />
        </svg>
      ))}
    </span>
  );
}

export function BrandLogo() {
  return (
    <Link
      href="/"
      aria-label="PSG Supporters Club Zurich"
      className="flex min-w-0 items-center gap-[clamp(8px,2.5vw,12px)] text-primary dark:text-foreground"
    >
      <Image
        src="/brand/psg-crest.svg"
        alt=""
        width={41}
        height={41}
        preload
        className="block h-auto w-[clamp(34px,9.6vw,41px)] shrink-0 drop-shadow-[0_4px_8px_oklch(0.2_0.05_248/0.2)]"
      />
      {/* Nudged down so the stars above the U stay within the crest's height. */}
      <span className="inline-flex translate-y-[clamp(1.5px,0.6vw,2.5px)] flex-col items-stretch gap-1 leading-none uppercase">
        {/* Letters spread to the exact width of "Supporters Club" below. */}
        <span
          aria-hidden
          className={`flex justify-between text-[length:clamp(19px,5.4vw,23px)] leading-none font-semibold ${trimToCaps}`}
        >
          {Array.from("ZURICH", (letter, index) =>
            letter === "U" ? (
              <span key={index} className="relative">
                {letter}
                <UclStars />
              </span>
            ) : (
              <span key={index}>{letter}</span>
            ),
          )}
        </span>
        <span
          className={`-mr-[0.08em] font-wide text-[length:clamp(6px,1.75vw,7.4px)] leading-none font-semibold tracking-[0.08em] whitespace-nowrap ${trimToCaps}`}
        >
          Supporters Club
        </span>
      </span>
    </Link>
  );
}
