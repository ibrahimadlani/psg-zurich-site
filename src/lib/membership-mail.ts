import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { members, type Locale } from "@/db/schema";

/*
 * Membership emails now go through the mailing (src/lib/mailing/triggers.ts). This keeps what
 * the account deletion hook needs to know before the member row disappears.
 */

export type DeletedAccountInfo = { locale: Locale; memberNumber: string | null };

export async function findDeletedAccountInfo(userId: string): Promise<DeletedAccountInfo | undefined> {
  const [row] = await db
    .select({ locale: members.locale, memberNumber: members.memberNumber })
    .from(members)
    .where(eq(members.userId, userId));
  return row;
}
