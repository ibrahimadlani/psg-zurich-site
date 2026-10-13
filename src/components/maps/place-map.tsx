"use client";

import { AdvancedMarker, APIProvider, ColorScheme, Map } from "@vis.gl/react-google-maps";
import Image from "next/image";
import { useSyncExternalStore } from "react";
import { MAP_ID, MAPS_API_KEY, mapsEnabled } from "@/lib/google-maps";

/** Follows the site theme (the "dark" class on <html>), not only the OS setting. */
function subscribeTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}
const isDark = () => document.documentElement.classList.contains("dark");

/** Small Google map centred on a place, with the club's crest as the pin. */
export function PlaceMap({ latitude, longitude, label }: { latitude: number; longitude: number; label: string }) {
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
        defaultZoom={15}
        // No controls at all; the Google logo and terms stay (required by Google).
        disableDefaultUI
        keyboardShortcuts={false}
        gestureHandling="cooperative"
        clickableIcons={false}
        aria-label={label}
        className="size-full"
      >
        <AdvancedMarker position={position} title={label}>
          <span className="flex flex-col items-center drop-shadow-[0_6px_10px_rgb(0_0_0/0.35)]">
            <span className="grid size-10 place-items-center rounded-full bg-white p-0.5 ring-2 ring-psg-red">
              <Image src="/brand/psg-crest.svg" alt="" width={34} height={34} className="size-[34px]" />
            </span>
            <span className="-mt-1 size-2.5 rotate-45 rounded-[2px] bg-psg-red" />
          </span>
        </AdvancedMarker>
      </Map>
    </APIProvider>
  );
}
