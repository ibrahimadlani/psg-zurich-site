import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { members } from "@/db/schema";
import { writeAuditLog } from "@/lib/audit";
import { seasonEnd } from "@/lib/dues";
import { onFeeRecorded } from "@/lib/mailing/triggers";

/**
 * Records (or cancels) the season's fee of accepted members, with one audit line each and the
 * receipt email. The one door for every way a fee comes in: the committee today ("manual"),
 * online payment later (its webhook will call this with its own source).
 */
export async function recordDues({
  memberIds,
  paid,
  actorId,
  ipAddress,
  source = "manual",
  receipt,
}: {
  memberIds: string[];
  paid: boolean;
  actorId: string | null;
  ipAddress: string | null;
  source?: "manual" | "online";
  /** Receipt of the payment that paid the fee, sent with the email. */
  receipt?: string;
}) {
  const expiresOn = paid ? seasonEnd() : null;
  const targets = await db
    .select({ id: members.id, expiresOn: members.expiresOn })
    .from(members)
    .where(and(inArray(members.id, memberIds), eq(members.status, "active")));
  // Only those whose state changes (marking a paid member paid again sends nothing).
  const changing = targets.filter((member) => (paid ? member.expiresOn !== expiresOn : member.expiresOn !== null));
  if (changing.length === 0) return { updated: 0, expiresOn };

  await db.transaction(async (tx) => {
    await tx.update(members).set({ expiresOn }).where(inArray(members.id, changing.map((member) => member.id)));
    for (const member of changing) {
      await writeAuditLog(
        {
          actorId,
          action: paid ? "member.dues_paid" : "member.dues_cancelled",
          entityType: "member",
          entityId: member.id,
          metadata: { expiresOn, source },
          ipAddress,
        },
        tx,
      );
    }
  });
  if (expiresOn) for (const member of changing) await onFeeRecorded(member.id, expiresOn, receipt);
  return { updated: changing.length, expiresOn };
}
