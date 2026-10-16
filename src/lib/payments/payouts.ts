import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { ledgerEntries, payments, stripePayouts } from "@/db/schema";
import { writeAuditLog } from "@/lib/audit";
import { fiscalYearOf } from "@/lib/money";
import { stripe, type Stripe } from "@/lib/payments/stripe";

const zurichDay = (unix: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Zurich" }).format(new Date(unix * 1000));

/**
 * A transfer reached the club's bank: every payment it contains is tied to it (a fee still
 * unknown is written now), and the transfer itself goes in the books — so the bank statement
 * can be ticked off line by line.
 */
export async function reconcilePayout(payout: Stripe.Payout) {
  const arrival = zurichDay(payout.arrival_date);
  let fees = 0;
  const id = crypto.randomUUID();
  await db
    .insert(stripePayouts)
    .values({ id, stripePayoutId: payout.id, amount: payout.amount, arrivalDate: arrival, status: payout.status })
    .onDuplicateKeyUpdate({ set: { status: payout.status } });
  const [row] = await db.select().from(stripePayouts).where(eq(stripePayouts.stripePayoutId, payout.id));
  if (!row) return;

  for await (const transaction of stripe().balanceTransactions.list({ payout: payout.id, limit: 100 })) {
    fees += transaction.fee;
    const chargeId = typeof transaction.source === "string" ? transaction.source : transaction.source?.id;
    if (!chargeId || (transaction.type !== "charge" && transaction.type !== "payment")) continue;
    const [payment] = await db.select().from(payments).where(eq(payments.stripeChargeId, chargeId));
    if (!payment) continue;
    await db.transaction(async (tx) => {
      await tx.update(payments).set({ payoutId: row.id }).where(eq(payments.id, payment.id));
      // Fee not known when the payment settled (some methods report it later).
      if (payment.feeAmount === null) {
        await tx.update(payments).set({ feeAmount: transaction.fee, netAmount: transaction.net }).where(and(eq(payments.id, payment.id), isNull(payments.feeAmount)));
        if (transaction.fee) {
          await tx.insert(ledgerEntries).values({
            date: arrival,
            fiscalYear: fiscalYearOf(arrival),
            account: "stripe_fees",
            amount: -transaction.fee,
            description: `${payment.receiptNumber ?? payment.id} · fees`,
            paymentId: payment.id,
          });
        }
      }
    });
  }

  // The transfer itself, once (it moves money from the provider to the bank: not income).
  const [already] = await db.select({ id: ledgerEntries.id }).from(ledgerEntries).where(eq(ledgerEntries.payoutId, row.id));
  if (!already && payout.status === "paid") {
    await db.insert(ledgerEntries).values({
      date: arrival,
      fiscalYear: fiscalYearOf(arrival),
      account: "payouts",
      amount: payout.amount,
      description: `Versement ${payout.id}`,
      payoutId: row.id,
    });
  }
  await db.update(stripePayouts).set({ fees }).where(eq(stripePayouts.id, row.id));
  await writeAuditLog({ actorId: null, action: "payment.payout", entityType: "payout", entityId: row.id, metadata: { stripePayoutId: payout.id, amount: payout.amount, arrival }, ipAddress: null });
}
