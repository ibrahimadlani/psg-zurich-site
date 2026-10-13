/*
 * How close a date is, to word it like a person would: "in 15 min", "in 14 h", "tomorrow",
 * "yesterday"; beyond that the caller shows a regular date.
 */

export type Closeness =
  | { kind: "now" }
  | { kind: "minutes" | "hours"; value: number }
  | { kind: "tomorrow" | "yesterday" }
  | { kind: "far" };

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
/** Up to this, "in 14 h" reads better than "today at 21:00"; after it, the calendar day. */
const HOURS_LIMIT = 20;

/** Calendar day (YYYY-MM-DD) in a time zone. */
export const dayIn = (date: Date, timeZone: string) => new Intl.DateTimeFormat("en-CA", { timeZone }).format(date);

/** Days between two calendar days (b − a). */
const dayGap = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / (24 * HOUR));

export function closeness(date: Date, now: Date, timeZone: string): Closeness {
  const diff = date.getTime() - now.getTime();
  const distance = Math.abs(diff);
  if (distance < MINUTE) return { kind: "now" };
  // Rounded towards now: 14 h 50 to go still reads "in 14 h".
  if (distance < HOUR) return { kind: "minutes", value: Math.sign(diff) * Math.floor(distance / MINUTE) };
  if (distance < HOURS_LIMIT * HOUR) return { kind: "hours", value: Math.sign(diff) * Math.floor(distance / HOUR) };
  const gap = dayGap(dayIn(now, timeZone), dayIn(date, timeZone));
  if (gap === 1) return { kind: "tomorrow" };
  if (gap === -1) return { kind: "yesterday" };
  return { kind: "far" };
}
