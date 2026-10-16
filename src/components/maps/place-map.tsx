"use client";

import { AdvancedMarker, APIProvider, ColorScheme, Map } from "@vis.gl/react-google-maps";
import { Component, useSyncExternalStore } from "react";
import { MapPin } from "lucide-react";
import { CrestPin } from "@/components/maps/crest-pin";
import { MAP_ID, MAPS_API_KEY, mapsEnabled } from "@/lib/google-maps";

/** Follows the site theme (the "dark" class on <html>), not only the OS setting. */
function subscribeTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}
const isDark = () => document.documentElement.classList.contains("dark");

/**
 * Google Maps can throw on its own (key refused on this address, a map torn down while its
 * marker is still being placed): only the map is replaced, never the whole page.
 */
class MapBoundary extends Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.warn("[maps] map unavailable:", error);
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="grid size-full place-items-center bg-foreground/[0.04] text-muted-foreground">
        <MapPin className="size-6" aria-hidden />
      </div>
    );
  }
}

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
    <MapBoundary>
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
            <CrestPin large={large} />
          </AdvancedMarker>
        </Map>
      </APIProvider>
    </MapBoundary>
  );
}
