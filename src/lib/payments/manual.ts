import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { members, paymentItems, payments, user, type PaymentMethod } from "@/db/schema";
import { isDuesPaid } from "@/lib/dues";
import { recordDues } from "@/lib/dues-record";
import { currentSeason, duesPriceFor } from "@/lib/payments/dues-price";
import { nextNumber } from "@/lib/payments/numbering";
import { refundPayment } from "@/lib/payments/refund";
import { settle } from "@/lib/payments/settle";

export type ManualMethod = Extract<PaymentMethod, "bank_transfer" | "cash" | "twint_manual">;
type Actor = { actorId: string; ipAddress: string | null };

/**
 * The committee records a fee paid by hand (bank transfer, cash, direct TWINT): it becomes a
 * payment like any other, with its receipt and its lines in the books.
 */
export async function recordManualDues(memberIds: string[], method: ManualMethod, actor: Actor, note?: string) {
  const rows = await db
    .select({ member: members, email: user.email })
    .from(members)
    .innerJoin(user, eq(user.id, members.userId))
    .where(and(inArray(members.id, memberIds), eq(members.status, "active")));
  let updated = 0;
  for (const { member, email } of rows) {
    if (isDuesPaid(member)) continue;
    const { season, amount, junior } = await duesPriceFor(member);
    const label = { fr: "Cotisation", en: "Membership fee", de: "Mitgliederbeitrag" }[member.locale];
    const juniorLabel = { fr: " junior", en: " (junior)", de: " Junior" }[member.locale];
    const id = crypto.randomUUID();
    await db.transaction(async (tx) => {
      await tx.insert(payments).values({
        id,
        reference: await nextNumber(tx, "P", 0),
        kind: "dues",
        amount,
        memberId: member.id,
        payerName: `${member.firstName} ${member.lastName}`.trim(),
        payerEmail: email,
        locale: member.locale,
        createdById: actor.actorId,
        ipAddress: actor.ipAddress,
      });
      await tx.insert(paymentItems).values({ paymentId: id, type: "dues", description: `${label}${junior ? juniorLabel : ""} ${season}`, quantity: 1, unitAmount: amount, total: amount, season });
    });
    if (await settle(id, { method, actorId: actor.actorId, ipAddress: actor.ipAddress, note: note ?? null })) updated++;
  }
  return { updated };
}

/**
 * The committee takes back a fee recorded by mistake: a fee paid by hand is reversed with a
 * credit note (the books keep both lines). A fee paid online is refunded from Finances instead,
 * so the money really goes back. Fees recorded before payments existed are simply cleared.
 */
export async function cancelDues(memberIds: string[], actor: Actor) {
  const season = currentSeason();
  let updated = 0;
  const online: string[] = [];
  for (const memberId of memberIds) {
    const [payment] = await db
      .select({ payments })
      .from(payments)
      .innerJoin(paymentItems, eq(paymentItems.paymentId, payments.id))
      .where(and(eq(payments.memberId, memberId), eq(payments.kind, "dues"), inArray(payments.status, ["succeeded", "partially_refunded"]), eq(paymentItems.season, season)))
      .orderBy(desc(payments.paidAt))
      .limit(1)
      .then((rows) => rows.map((row) => row.payments));
    if (!payment) {
      updated += (await recordDues({ memberIds: [memberId], paid: false, actorId: actor.actorId, ipAddress: actor.ipAddress })).updated;
      continue;
    }
    if (payment.method && ["bank_transfer", "cash", "twint_manual"].includes(payment.method)) {
      const reason = { fr: "Annulation par le comité", en: "Cancelled by the committee", de: "Storno durch den Vorstand" }[payment.locale];
      await refundPayment({ paymentId: payment.id, amount: payment.amount - payment.refundedAmount, reason, ...actor });
      updated++;
    } else {
      online.push(memberId);
    }
  }
  return { updated, online };
}
