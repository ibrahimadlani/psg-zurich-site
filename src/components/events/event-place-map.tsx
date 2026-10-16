"use client";

import { ArrowUpRight, ChevronDown } from "lucide-react";
import { useId, useState } from "react";
import { PlaceMap } from "@/components/maps/place-map";
import { cn } from "@/lib/utils";

/**
 * "Voir sur la carte" in the Où row: unfolds the map under the row like an accordion (height
 * and fade, the caret turns). The map only loads the first time it opens.
 */
export function EventPlaceMap({
  latitude,
  longitude,
  label,
  directionsUrl,
  buttonClassName,
  labels,
  drive,
}: {
  latitude: number;
  longitude: number;
  label: string;
  directionsUrl: string | null;
  buttonClassName: string;
  labels: { show: string; hide: string; directions: string };
  /** Drive time from the member's home, on the right of the Google Maps link. */
  drive?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const panel = useId();

  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panel}
        onClick={() => {
          setLoaded(true);
          setOpen((value) => !value);
        }}
        className={cn(buttonClassName, "inline-flex cursor-pointer items-center gap-1")}
      >
        {open ? labels.hide : labels.show}
        <ChevronDown className={cn("size-3.5 transition-transform duration-300 ease-out", open && "rotate-180")} aria-hidden />
      </button>
      <div
        id={panel}
        data-open={open || undefined}
        className="col-span-full grid grid-rows-[0fr] opacity-0 transition-[grid-template-rows,opacity] duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] data-[open]:grid-rows-[1fr] data-[open]:opacity-100 motion-reduce:transition-none"
      >
        <div className="min-h-0 overflow-hidden" inert={!open}>
          <div className="space-y-2 pt-3">
            <div className="aspect-[16/9] overflow-hidden rounded-[12px] border bg-psg-blue/10 sm:aspect-[21/9]">
              {loaded ? <PlaceMap latitude={latitude} longitude={longitude} label={label} /> : null}
            </div>
            <div className="flex items-center justify-between gap-3">
              {directionsUrl ? (
                <a
                  href={directionsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 border-b pb-0.5 text-[13px] text-muted-foreground transition-colors hover:border-psg-red hover:text-foreground"
                >
                  {labels.directions}
                  <ArrowUpRight className="size-3.5" aria-hidden />
                </a>
              ) : (
                <span />
              )}
              {drive}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
