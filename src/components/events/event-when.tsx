import { useFormatter } from "next-intl";
import { HumanDate } from "@/components/human-date";
import { dayIn } from "@/lib/human-date";

const ZONE = "Europe/Zurich";

/**
 * When an event happens: "Dans 3 h · 19:00 – 23:00", "Demain · 19:00 – 23:00",
 * "Mercredi 21 octobre · 19:00 – 23:00". Events over several days keep the full range.
 */
export function EventWhen({ startsAt, endsAt }: { startsAt: Date; endsAt: Date | null }) {
  const format = useFormatter();
  const end = endsAt ?? startsAt;
  if (dayIn(startsAt, ZONE) !== dayIn(end, ZONE)) {
    return (
      <span className="inline-block first-letter:uppercase">
        {format.dateTimeRange(startsAt, end, { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
      </span>
    );
  }
  const hours = endsAt
    ? format.dateTimeRange(startsAt, endsAt, { hour: "2-digit", minute: "2-digit" })
    : format.dateTime(startsAt, { hour: "2-digit", minute: "2-digit" });
  return (
    <>
      <HumanDate date={startsAt} absolute={{ weekday: "long", day: "numeric", month: "long" }} withTime={false} capitalize />
      {" · "}
      {hours}
    </>
  );
}
