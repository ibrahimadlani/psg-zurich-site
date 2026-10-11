import Image from "next/image";
import { Link } from "@/i18n/navigation";

export function BrandLogo() {
  return (
    <Link
      href="/"
      aria-label="PSG Official Supporters Club Zurich"
      className="flex items-center gap-3 text-primary dark:text-foreground"
    >
      <Image
        src="/brand/psg-crest.svg"
        alt=""
        width={44}
        height={44}
        preload
        className="block size-11 drop-shadow-[0_4px_8px_oklch(0.2_0.05_248/0.2)]"
      />
      <span className="flex flex-col gap-0.5 leading-none uppercase">
        <span className="font-wide text-[11px] font-normal tracking-[0.04em]">Official</span>
        <span className="font-narrow text-[20px] font-semibold tracking-[0.01em]">
          Supporters Club Zurich
        </span>
      </span>
    </Link>
  );
}
