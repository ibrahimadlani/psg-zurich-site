"use client";

import { AdvancedMarker, APIProvider, ColorScheme, Map } from "@vis.gl/react-google-maps";
import Image from "next/image";
import { useSyncExternalStore } from "react";
import { MAP_ID, MAPS_API_KEY, mapsEnabled } from "@/lib/google-maps";
import { cn } from "@/lib/utils";

/** Follows the site theme (the "dark" class on <html>), not only the OS setting. */
function subscribeTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}
const isDark = () => document.documentElement.classList.contains("dark");

/**
 * Google map centred on a place, with the club's crest as the pin. `large`: bigger pin with a
 * slow red pulse (contact page); `zoom` 15 = street level, 13 = city.
 */
export function PlaceMap({
  latitude,
  longitude,
  label,
  zoom = 15,
  large = false,
}: {
  latitude: number;
  longitude: number;
  label: string;
  zoom?: number;
  large?: boolean;
}) {
  const dark = useSyncExternalStore(subscribeTheme, isDark, () => false);
  if (!mapsEnabled) return null;
  const position = { lat: latitude, lng: longitude };

  return (
    <APIProvider apiKey={MAPS_API_KEY}>
      {/* The colour scheme is fixed when a map is created: a new map when the theme changes. */}
      <Map
        key={dark ? "dark" : "light"}
        mapId={MAP_ID}
        colorScheme={dark ? ColorScheme.DARK : ColorScheme.LIGHT}
        defaultCenter={position}
        defaultZoom={zoom}
        // No controls at all; the Google logo and terms stay (required by Google).
        disableDefaultUI
        keyboardShortcuts={false}
        gestureHandling="cooperative"
        clickableIcons={false}
        aria-label={label}
        className="size-full"
      >
        <AdvancedMarker position={position} title={label}>
          <span className="relative flex flex-col items-center drop-shadow-[0_6px_10px_rgb(0_0_0/0.35)]">
            {large ? (
              <span
                aria-hidden
                className="absolute bottom-0 left-1/2 size-20 -translate-x-1/2 translate-y-1/2 animate-ping rounded-full bg-psg-red/25 [animation-duration:2.4s] motion-reduce:hidden"
              />
            ) : null}
            <span
              className={cn(
                "relative grid place-items-center rounded-full bg-white p-0.5 ring-2 ring-psg-red",
                large ? "size-14" : "size-10",
              )}
            >
              <Image
                src="/brand/psg-crest.svg"
                alt=""
                width={48}
                height={48}
                className={large ? "size-12" : "size-[34px]"}
              />
            </span>
            <span className={cn("relative -mt-1 rotate-45 rounded-[2px] bg-psg-red", large ? "size-3" : "size-2.5")} />
          </span>
        </AdvancedMarker>
      </Map>
    </APIProvider>
  );
}
