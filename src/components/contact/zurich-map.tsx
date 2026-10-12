import Image from "next/image";

/** Zurich city centre (Hauptbahnhof / Bahnhofstrasse). */
const CENTER = { lat: 47.3744, lng: 8.5411 };
const EMBED = `https://www.google.com/maps?ll=${CENTER.lat},${CENTER.lng}&z=13&output=embed`;
export const MAPS_URL = "https://www.google.com/maps/place/Z%C3%BCrich";

/**
 * Google Maps centred on Zurich, tinted in the site's colours: the embed is made grey, then
 * PSG blue is blended over it (light) or it is inverted into a night map (dark). The crest pin
 * sits on top; clicks still reach the map.
 */
export function ZurichMap({ label }: { label: string }) {
  return (
    <div className="relative isolate aspect-[4/3] overflow-hidden rounded-[14px] border bg-psg-blue shadow-brand sm:aspect-[16/9]">
      <iframe
        src={EMBED}
        title={label}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="absolute inset-0 size-full border-0 [filter:grayscale(1)_contrast(1.05)_brightness(1.02)] dark:[filter:grayscale(1)_invert(0.92)_contrast(0.95)_brightness(0.9)]"
      />
      {/* Club-colour tint over the grey map. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-psg-blue mix-blend-color opacity-80 dark:opacity-60"
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-psg-blue/10 dark:bg-psg-blue/25" />
      {/* Crest pin, tip on the centre of the map. */}
      <div aria-hidden className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full">
        <span className="absolute bottom-0 left-1/2 size-16 -translate-x-1/2 translate-y-1/2 animate-ping rounded-full bg-psg-red/25 [animation-duration:2.4s] motion-reduce:hidden" />
        <span className="relative flex flex-col items-center drop-shadow-[0_8px_14px_rgb(0_0_0/0.35)]">
          <span className="grid size-12 place-items-center rounded-full bg-white p-1 ring-2 ring-psg-red">
            <Image src="/brand/psg-crest.svg" alt="" width={40} height={40} className="size-10" />
          </span>
          <span className="-mt-1 size-3 rotate-45 rounded-[2px] bg-psg-red" />
        </span>
      </div>
    </div>
  );
}
