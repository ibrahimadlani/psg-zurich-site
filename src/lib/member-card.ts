import "server-only";
import { randomBytes } from "node:crypto";
import { and, eq, gte, lte } from "drizzle-orm";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { db } from "@/db";
import { attendance, events, members } from "@/db/schema";

/*
 * Member card QR code: a random token (not the member id), checked by the scan page that
 * organisers open by scanning it. Replacing the token voids a leaked card.
 */

/** The member's card token, created on first use. */
export async function ensureCardToken(memberId: string, current: string | null) {
  if (current) return current;
  const token = randomBytes(16).toString("base64url");
  await db.update(members).set({ cardToken: token }).where(eq(members.id, memberId));
  return token;
}

/** Address the QR code points to: the scan page (the locale follows the organiser's phone). */
export async function cardScanUrl(token: string) {
  const configured = process.env.BETTER_AUTH_URL;
  if (configured) return `${configured.replace(/\/$/, "")}/admin/scan/${token}`;
  const list = await headers();
  const host = list.get("x-forwarded-host") ?? list.get("host") ?? "localhost:3000";
  const protocol = list.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protocol}://${host}/admin/scan/${token}`;
}

/** QR code as SVG markup (dark modules in PSG blue, transparent background). */
export const qrSvg = (text: string) =>
  QRCode.toString(text, {
    type: "svg",
    margin: 0,
    errorCorrectionLevel: "M",
    color: { dark: "#0b3b6aff", light: "#00000000" },
  });

/** Member behind a scanned token, or null. */
export async function memberByCardToken(token: string) {
  if (!/^[\w-]{16,32}$/.test(token)) return null;
  const [member] = await db.select().from(members).where(eq(members.cardToken, token));
  return member ?? null;
}

const HOURS = 60 * 60 * 1000;

/** Club events from 12 h ago (still running) to 12 h ahead (doors opening), with the member's sign-up. */
export function eventsAroundNow(memberId: string) {
  const now = Date.now();
  return db
    .select({
      id: events.id,
      title: events.title,
      startsAt: events.startsAt,
      location: events.location,
      status: attendance.status,
      checkedInAt: attendance.checkedInAt,
    })
    .from(events)
    .leftJoin(attendance, and(eq(attendance.eventId, events.id), eq(attendance.memberId, memberId)))
    .where(and(gte(events.startsAt, new Date(now - 12 * HOURS)), lte(events.startsAt, new Date(now + 12 * HOURS))))
    .orderBy(events.startsAt);
}
