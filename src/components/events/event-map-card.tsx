import { ArrowUpRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { PlaceMap } from "@/components/maps/place-map";
import { mapsEnabled, mapsLink } from "@/lib/google-maps";

/** Where the event takes place: small map with the pin, the place's name and address. */
export function EventMapCard({
  location,
  address,
  placeId,
  latitude,
  longitude,
}: {
  location: string | null;
  address: string | null;
  placeId: string | null;
  latitude: number;
  longitude: number;
}) {
  const t = useTranslations("Events");
  if (!mapsEnabled) return null;
  const name = location || address || "";

  return (
    <section className="overflow-hidden rounded-[14px] border bg-card shadow-brand">
      <div className="aspect-[4/3] bg-psg-blue/10">
        <PlaceMap latitude={latitude} longitude={longitude} label={name} />
      </div>
      <div className="flex flex-col gap-1 p-4">
        {location ? <p className="text-[15px] font-semibold">{location}</p> : null}
        {address ? <p className="text-[13px] text-muted-foreground">{address}</p> : null}
        <a
          href={mapsLink(address || name, placeId)}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1 self-start border-b pb-0.5 text-[13px] transition-colors hover:border-psg-red"
        >
          {t("directions")}
          <ArrowUpRight className="size-3.5" aria-hidden />
        </a>
      </div>
    </section>
  );
}
