"use client";

import { useFormatter, useNow, useTimeZone, useTranslations, type DateTimeFormatOptions } from "next-intl";
import { closeness } from "@/lib/human-date";
import { cn } from "@/lib/utils";

/**
 * A match or event date, worded like a person would and kept fresh while the page is open:
 * "dans 15 min", "dans 14 h", "demain à 21:00", "hier à 18:30"; further away, the date in
 * `absolute` format. The full date stays in the tooltip and in <time dateTime>.
 *
 * `withTime`: add the time to "demain" / "hier" (off where the time is shown next to it).
 */
export function HumanDate({
  date,
  absolute = { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" },
  withTime = true,
  capitalize = false,
  className,
}: {
  date: Date | string;
  absolute?: DateTimeFormatOptions;
  withTime?: boolean;
  capitalize?: boolean;
  className?: string;
}) {
  const t = useTranslations("HumanDate");
  const format = useFormatter();
  const timeZone = useTimeZone() ?? "Europe/Zurich";
  // Minutes left must tick: refreshed every 30 s.
  const now = useNow({ updateInterval: 30_000 });
  const value = date instanceof Date ? date : new Date(date);
  const time = format.dateTime(value, { hour: "2-digit", minute: "2-digit" });
  const near = closeness(value, now, timeZone);

  let label: string;
  switch (near.kind) {
    case "now":
      label = t("now");
      break;
    case "minutes":
    case "hours":
      label = format.relativeTime(value, { now, unit: near.kind === "minutes" ? "minute" : "hour", style: "short" });
      break;
    case "tomorrow":
    case "yesterday":
      label = withTime ? t(`${near.kind}At`, { time }) : t(near.kind);
      break;
    default:
      label = format.dateTime(value, absolute);
  }
  if (capitalize) label = label.charAt(0).toLocaleUpperCase() + label.slice(1);

  return (
    <time
      dateTime={value.toISOString()}
      title={format.dateTime(value, { dateStyle: "full", timeStyle: "short" })}
      // Server and browser clocks differ by a few seconds: the label may change on hydration.
      suppressHydrationWarning
      className={cn(className)}
    >
      {label}
    </time>
  );
}
