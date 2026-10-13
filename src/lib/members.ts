import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { members } from "@/db/schema";
import { eventAccess, isDuesPaid } from "@/lib/dues";
import { getSession, HttpError, requireRole } from "@/lib/permissions";

/** Member row of the signed-in user, or null (no session, or no member profile). */
export async function getCurrentMember() {
  const session = await getSession();
  if (!session) return null;
  const [member] = await db.select().from(members).where(eq(members.userId, session.user.id));
  return member ?? null;
}

/** Session + member, for features reserved to accepted members (predictions, event sign-up). */
export async function requireActiveMember() {
  const session = await requireRole("member");
  const [member] = await db.select().from(members).where(eq(members.userId, session.user.id));
  if (!member || member.status !== "active") {
    throw new HttpError(403, "membership_inactive", "Reserved to accepted members.");
  }
  return { session, member };
}

/** Session + member whose fee is paid, for the club's events (programme, sign-ups). */
export async function requirePaidMember() {
  const { session, member } = await requireActiveMember();
  if (!isDuesPaid(member)) throw new HttpError(403, "dues_unpaid", "Reserved to members whose fee is paid.");
  return { session, member };
}

/** Session, member and where they stand for events — for pages. */
export async function getEventAccess() {
  const session = await getSession();
  const member = session ? await getCurrentMember() : null;
  return { session, member, access: eventAccess(Boolean(session), member) };
}
