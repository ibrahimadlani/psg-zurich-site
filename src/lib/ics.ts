/** Minimal iCalendar (RFC 5545) writer: enough for match and event feeds. */
export type IcsEvent = {
  uid: string;
  start: Date;
  end: Date;
  summary: string;
  description?: string | null;
  location?: string | null;
  url?: string | null;
  updatedAt?: Date;
  cancelled?: boolean;
  /** The day is known, not the time. */
  allDay?: boolean;
};

const stamp = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

const day = (date: Date) => date.toISOString().slice(0, 10).replace(/-/g, "");

const escape = (text: string) =>
  text.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\;");

// Lines longer than 75 octets are folded (CRLF + space), never inside a UTF-8 character.
function fold(line: string) {
  const bytes = new TextEncoder();
  const out: string[] = [];
  let current = "";
  for (const char of line) {
    if (bytes.encode(current + char).length > (out.length === 0 ? 75 : 74)) {
      out.push(current);
      current = char;
    } else {
      current += char;
    }
  }
  out.push(current);
  return out.join("\r\n ");
}

export function buildCalendar({ name, events }: { name: string; events: IcsEvent[] }) {
  const now = stamp(new Date());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PSG Zurich//psg-zurich.ch//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escape(name)}`,
    "X-WR-TIMEZONE:Europe/Zurich",
    // Subscribed calendars refresh every 6 hours.
    "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
    "X-PUBLISHED-TTL:PT6H",
  ];
  for (const event of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.uid}`,
      `DTSTAMP:${event.updatedAt ? stamp(event.updatedAt) : now}`,
      event.allDay ? `DTSTART;VALUE=DATE:${day(event.start)}` : `DTSTART:${stamp(event.start)}`,
      event.allDay ? `DTEND;VALUE=DATE:${day(new Date(event.start.getTime() + 86_400_000))}` : `DTEND:${stamp(event.end)}`,
      `SUMMARY:${escape(event.summary)}`,
    );
    if (event.description) lines.push(`DESCRIPTION:${escape(event.description)}`);
    if (event.location) lines.push(`LOCATION:${escape(event.location)}`);
    if (event.url) lines.push(`URL:${event.url}`);
    if (event.cancelled) lines.push("STATUS:CANCELLED");
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

export function icsResponse(body: string, filename?: string) {
  return new Response(body, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "cache-control": "public, max-age=900",
      ...(filename ? { "content-disposition": `attachment; filename="${filename}"` } : {}),
    },
  });
}
