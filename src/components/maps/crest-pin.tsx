import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * The club's map pin, kept minimal: the crest on a white disc, a hairline stem, a red dot on the
 * spot. It drops in once when the map appears; `large` (contact page) adds a faint ripple around
 * the dot. The bottom of the element is the spot.
 */
export function CrestPin({ large = false }: { large?: boolean }) {
  return (
    <span aria-hidden className="relative flex animate-pin-drop flex-col items-center motion-reduce:animate-none">
      {large ? (
        <span className="absolute bottom-0 left-1/2 size-10 -translate-x-1/2 translate-y-1/2 animate-pin-ripple rounded-full border border-psg-red/60 motion-reduce:hidden" />
      ) : null}
      <span className={cn("grid place-items-center rounded-full bg-white shadow-[0_4px_12px_rgb(0_0_0/0.25)]", large ? "size-12" : "size-9")}>
        <Image src="/brand/psg-crest.svg" alt="" width={40} height={40} className={large ? "size-9" : "size-7"} />
      </span>
      <span className={cn("w-0.5 bg-psg-blue ring-1 ring-white/70", large ? "h-3.5" : "h-2.5")} />
      {/* The spot itself, centred on the anchor. */}
      <span className="size-2 translate-y-1/2 rounded-full bg-psg-red ring-2 ring-white" />
    </span>
  );
}
