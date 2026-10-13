/*
 * Google Maps Platform settings (browser key, restricted to the site's domains in the
 * Google Cloud console). NEXT_PUBLIC_* values are inlined at build time: set them in .env
 * before building. Without a key, maps are hidden and address fields stay plain text.
 */
export const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
/** Map ID carrying the club's map style (light and dark); Google's demo id otherwise. */
export const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID || "DEMO_MAP_ID";
export const mapsEnabled = MAPS_API_KEY.length > 0;

/** Link that opens a place in Google Maps (by place id when known). */
export function mapsLink(query: string, placeId?: string | null) {
  const url = new URL("https://www.google.com/maps/search/");
  url.searchParams.set("api", "1");
  url.searchParams.set("query", query);
  if (placeId) url.searchParams.set("query_place_id", placeId);
  return url.toString();
}

/** Where member addresses are searched: Switzerland and its neighbours. */
export const MEMBER_ADDRESS_REGIONS = ["ch", "fr", "de", "it", "at", "li"];

/** What an address field gives back once a suggestion is picked. */
export type PickedAddress = {
  /** Full address as Google writes it ("Langstrasse 10, 8004 Zürich, Schweiz"). */
  formatted: string;
  /** Street and number only ("Langstrasse 10"), for member addresses. */
  street: string;
  postcode: string;
  city: string;
  placeId: string;
  latitude: number;
  longitude: number;
};
