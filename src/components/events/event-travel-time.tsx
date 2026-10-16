import { Car } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { drivingTime } from "@/lib/route-time";

/** "5h58" / "25 min". */
function duration(seconds: number) {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, "0")}`;
}

/**
 * Under the event map, on the right of the Google Maps link: the drive from the member's home
 * ("5h58 (527 km)"). Streams in after the page (the first computation waits on Google);
 * nothing when unknown.
 */
export async function EventTravelTime({
  origin,
  destination,
}: {
  origin: string;
  destination: { latitude: number; longitude: number };
}) {
  const route = await drivingTime(origin, destination);
  if (!route) return null;
  const [t, format] = await Promise.all([getTranslations("Events"), getFormatter()]);
  const distance = format.number(route.distanceMeters / 1000, {
    style: "unit",
    unit: "kilometer",
    maximumFractionDigits: route.distanceMeters < 10_000 ? 1 : 0,
  });
  const time = duration(route.durationSeconds);
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 text-[13px] whitespace-nowrap text-muted-foreground tabular-nums" title={t("driveTime", { duration: time, distance })}>
      <Car className="size-4 shrink-0" aria-hidden />
      <span aria-hidden>
        {time} ({distance})
      </span>
      <span className="sr-only">{t("driveTime", { duration: time, distance })}</span>
    </span>
  );
}
