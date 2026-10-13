import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/** Email categories a member can turn off (transactional emails can't be). */
export const NOTIFICATION_TYPES = ["events", "reminders", "results", "news"] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

const sign = (memberId: string, type: NotificationType) =>
  createHmac("sha256", process.env.BETTER_AUTH_SECRET ?? "")
    .update(`unsubscribe:${memberId}:${type}`)
    .digest("base64url");

/**
 * Signed link for emails (footer + List-Unsubscribe header): works without signing in and
 * cannot be forged for another member or type. GET shows a confirmation page, POST unsubscribes.
 */
export function unsubscribeUrl(origin: string, locale: string, memberId: string, type: NotificationType) {
  const params = new URLSearchParams({ m: memberId, t: type, s: sign(memberId, type), l: locale });
  return `${origin}/api/unsubscribe?${params}`;
}

export function verifyUnsubscribe(memberId: string, type: string, signature: string): type is NotificationType {
  if (!(NOTIFICATION_TYPES as readonly string[]).includes(type)) return false;
  const expected = Buffer.from(sign(memberId, type as NotificationType));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
