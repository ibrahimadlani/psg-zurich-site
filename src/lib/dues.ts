/*
 * Membership fee ("cotisation"): a member is fully in once the committee has recorded the fee
 * for the season. The season runs 1 July – 30 June; members.expires_on holds the last day
 * covered. Event programme and sign-ups are for members whose fee is paid.
 */

/** Calendar date in Zurich (YYYY-MM-DD). */
export const todayInZurich = (now = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Zurich" }).format(now);

/** Last day of the club season that contains `today` (30 June). */
export function seasonEnd(today = todayInZurich()) {
  const [year, month] = today.split("-").map(Number) as [number, number];
  return `${month >= 7 ? year + 1 : year}-06-30`;
}

/** Age in whole years on `today` (both YYYY-MM-DD). */
export function ageOn(birthDate: string, today = todayInZurich()) {
  const [by, bm, bd] = birthDate.split("-").map(Number) as [number, number, number];
  const [ty, tm, td] = today.split("-").map(Number) as [number, number, number];
  return ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0);
}

/** Statutes: members under 18 are juniors (reduced fee, legal guardian's consent). */
export const isJunior = (birthDate: string | null | undefined, today = todayInZurich()) =>
  !!birthDate && ageOn(birthDate, today) < 18;

type MemberLike = { status: string; expiresOn: string | null } | null | undefined;

export const isDuesPaid = (member: MemberLike, today = todayInZurich()) =>
  member?.status === "active" && member.expiresOn !== null && member.expiresOn >= today;

/**
 * Where someone stands for club events: visitor, waiting for the committee, accepted but fee
 * not paid, or full member.
 */
export type EventAccess = "guest" | "pending" | "unpaid" | "full";

export function eventAccess(signedIn: boolean, member: MemberLike): EventAccess {
  if (!signedIn) return "guest";
  if (member?.status !== "active") return "pending";
  return isDuesPaid(member) ? "full" : "unpaid";
}
