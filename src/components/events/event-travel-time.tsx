import { Car } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { directionsLink, drivingTime } from "@/lib/route-time";

/** "1 h 05" / "25 min". */
function duration(seconds: number) {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")}`;
}

/**
 * Under "Where": the drive from the member's home, linking to the directions in Google Maps.
 * Streams in after the page (the first computation waits on Google); nothing when unknown.
 */
export async function EventTravelTime({
  origin,
  destination,
  placeId,
}: {
  origin: string;
  destination: { latitude: number; longitude: number };
  placeId: string | null;
}) {
  const route = await drivingTime(origin, destination);
  if (!route) return null;
  const [t, format] = await Promise.all([getTranslations("Events"), getFormatter()]);
  const distance = format.number(route.distanceMeters / 1000, {
    style: "unit",
    unit: "kilometer",
    maximumFractionDigits: route.distanceMeters < 10_000 ? 1 : 0,
  });
  return (
    <a
      href={directionsLink(origin, destination, placeId)}
      target="_blank"
      rel="noreferrer"
      className="mt-2 flex items-start gap-1.5 text-[14px] text-muted-foreground transition-colors hover:text-foreground"
    >
      <Car className="mt-[3px] size-4 shrink-0" aria-hidden />
      <span>
        {t("driveTime", { duration: duration(route.durationSeconds), distance })}
        <span className="ml-1.5 border-b">{t("route")}</span>
      </span>
    </a>
  );
}
