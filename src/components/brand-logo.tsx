import Image from "next/image";
import { Link } from "@/i18n/navigation";

const trimToCaps = "[text-box:trim-both_cap_alphabetic]";

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
        width={36}
        height={36}
        preload
        className="block h-auto w-[clamp(30px,8.5vw,36px)] shrink-0 drop-shadow-[0_4px_8px_oklch(0.2_0.05_248/0.2)]"
      />
      <span className="inline-flex flex-col items-stretch gap-1 leading-none uppercase">
        {/* Letters spread to the exact width of "Supporters Club" below. */}
        <span
          aria-hidden
          className={`flex justify-between text-[length:clamp(19px,5.4vw,23px)] leading-none font-semibold ${trimToCaps}`}
        >
          {Array.from("ZURICH", (letter, index) => (
            <span key={index}>{letter}</span>
          ))}
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
