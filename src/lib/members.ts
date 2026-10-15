import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { members } from "@/db/schema";
import { eventAccess, isDuesPaid, seasonEnd, todayInZurich } from "@/lib/dues";
import { nextMemberNumber } from "@/lib/member-number";
import type { Session } from "@/lib/auth";
import { getSession, HttpError, requireRole } from "@/lib/permissions";
import { hasRole } from "@/lib/roles";

type Member = typeof members.$inferSelect;

/**
 * Committee accounts (moderator, admin, superadmin) are members by definition: if one has no member
 * profile yet, or one still waiting for approval, it is created / accepted on first use, so
 * every member feature works for them (predictions and sign-ups need the row).
 */
async function ensureCommitteeMember(session: Session, member: Member | undefined): Promise<Member> {
  if (member?.status === "active") return member;
  const today = todayInZurich();
  if (member) {
    await db
      .update(members)
      .set({ status: "active", joinedOn: member.joinedOn ?? today, memberNumber: member.memberNumber ?? (await nextMemberNumber()) })
      .where(eq(members.id, member.id));
  } else {
    const [firstName = "", ...rest] = (session.user.name || session.user.email.split("@")[0]!).trim().split(/\s+/);
    await db.insert(members).values({
      userId: session.user.id,
      firstName: firstName.slice(0, 100) || "Admin",
      lastName: rest.join(" ").slice(0, 100),
      status: "active",
      joinedOn: today,
      memberNumber: await nextMemberNumber(),
      // No welcome questions forced on the committee: reachable later from the member area.
      onboardedAt: new Date(),
    });
  }
  const [row] = await db.select().from(members).where(eq(members.userId, session.user.id));
  return row!;
}

/** Member row for a session, with the committee's rights applied. */
async function memberFor(session: Session): Promise<Member | null> {
  const [member] = await db.select().from(members).where(eq(members.userId, session.user.id));
  if (!hasRole(session.user.role, "moderator")) return member ?? null;
  const row = await ensureCommitteeMember(session, member);
  // The committee runs the club: no fee needed to open member features (the paid-until date
  // shown is the season's end; nothing is written to the dues record).
  const end = seasonEnd();
  return { ...row, expiresOn: row.expiresOn && row.expiresOn > end ? row.expiresOn : end };
}

/** Member row of the signed-in user, or null (no session, or no member profile). */
export async function getCurrentMember() {
  const session = await getSession();
  if (!session) return null;
  return memberFor(session);
}

/** Session + member, for features reserved to accepted members (predictions, event sign-up). */
export async function requireActiveMember() {
  const session = await requireRole("member");
  const member = await memberFor(session);
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
