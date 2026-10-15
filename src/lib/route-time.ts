import "server-only";
import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { routeTimes } from "@/db/schema";

/*
 * Driving time from a member's home to an event, with the Google Routes API (server key, never
 * sent to browsers). Each home/event pair is computed once and kept in `route_times`; billed as
 * "Compute Routes Essentials" (traffic unaware): 10,000 free requests a month.
 */
const apiKey = () => process.env.GOOGLE_ROUTES_API_KEY ?? "";
export const routeTimesEnabled = () => apiKey().length > 0;

/** Road times barely move: a cached result is reused for 90 days. */
const MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;
/** Stored when Google finds no road (another continent, a typo): not asked again. */
const NO_ROUTE = -1;

export type RouteTime = { durationSeconds: number; distanceMeters: number };

/** "Langstrasse 10, 8004 Zürich", or what there is of it; null without a postcode or city. */
export function homeAddress(member: { address: string | null; postcode: string | null; city: string | null }) {
  const town = [member.postcode, member.city].map((part) => part?.trim()).filter(Boolean).join(" ");
  if (!town) return null;
  return [member.address?.trim(), town].filter(Boolean).join(", ");
}

export async function drivingTime(origin: string, destination: { latitude: number; longitude: number }): Promise<RouteTime | null> {
  if (!routeTimesEnabled()) return null;
  // The key hides the address: only the hash of the pair is stored.
  const key = createHash("sha256").update(`${origin.toLowerCase()}|${destination.latitude.toFixed(5)},${destination.longitude.toFixed(5)}`).digest("hex");

  const [cached] = await db.select().from(routeTimes).where(eq(routeTimes.key, key));
  if (cached && Date.now() - cached.computedAt.getTime() < MAX_AGE_MS) {
    return cached.durationSeconds === NO_ROUTE ? null : cached;
  }

  let result: RouteTime | null;
  try {
    const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-Goog-Api-Key": apiKey(),
        // Only these two fields: anything more moves the request to a pricier tier.
        "X-Goog-FieldMask": "routes.duration,routes.distanceMeters",
      },
      body: JSON.stringify({
        origin: { address: origin },
        destination: { location: { latLng: destination } },
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_UNAWARE",
        units: "METRIC",
      }),
      signal: AbortSignal.timeout(4000),
      cache: "no-store",
    });
    if (!response.ok) {
      console.error(`[routes] Google answered ${response.status}: ${(await response.text()).slice(0, 300)}`);
      return null; // Not cached: a key or quota problem should not stick once fixed.
    }
    const body = (await response.json()) as { routes?: { duration?: string; distanceMeters?: number }[] };
    const route = body.routes?.[0];
    result = route?.duration ? { durationSeconds: Number.parseInt(route.duration, 10), distanceMeters: route.distanceMeters ?? 0 } : null;
  } catch (error) {
    console.error("[routes] request failed", error);
    return null;
  }

  const row = { durationSeconds: result?.durationSeconds ?? NO_ROUTE, distanceMeters: result?.distanceMeters ?? 0, computedAt: new Date() };
  await db
    .insert(routeTimes)
    .values({ key, ...row })
    .onDuplicateKeyUpdate({ set: row });
  return result;
}

/** Google Maps directions from home to the event, opened by the member's own click. */
export function directionsLink(origin: string, destination: { latitude: number; longitude: number }, placeId?: string | null) {
  const url = new URL("https://www.google.com/maps/dir/");
  url.searchParams.set("api", "1");
  url.searchParams.set("origin", origin);
  url.searchParams.set("destination", `${destination.latitude},${destination.longitude}`);
  if (placeId) url.searchParams.set("destination_place_id", placeId);
  url.searchParams.set("travelmode", "driving");
  return url.toString();
}
