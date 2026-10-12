import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { members } from "@/db/schema";
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
