import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { members, orders, paymentItems, payments } from "@/db/schema";
import { recordDues } from "@/lib/dues-record";
import { committeeRecipients, enqueue, type Recipient } from "@/lib/mailing/queue";
import { formatChf } from "@/lib/money";
import { formatPaymentReference } from "@/lib/payments/config";
import { ensureReceipt } from "@/lib/payments/receipts";

type Payment = typeof payments.$inferSelect;

const WHAT = {
  donation: { fr: "votre don", en: "your donation", de: "deine Spende" },
  shop: { fr: "votre commande {payment}", en: "your order {payment}", de: "deine Bestellung {payment}" },
  dues: { fr: "votre cotisation", en: "your membership fee", de: "deinen Mitgliederbeitrag" },
} as const;

/** The payer as an email recipient (members and visitors alike). */
export async function payerRecipient(payment: Payment): Promise<Recipient> {
  const [member] = payment.memberId ? await db.select({ firstName: members.firstName }).from(members).where(eq(members.id, payment.memberId)) : [];
  return { memberId: payment.memberId, email: payment.payerEmail, locale: payment.locale, firstName: member?.firstName ?? payment.payerName.split(" ")[0] ?? "" };
}

/** "Écharpe × 1, T-shirt (M) × 2". */
export async function itemsSummary(paymentId: string) {
  const items = await db.select().from(paymentItems).where(eq(paymentItems.paymentId, paymentId));
  return items
    .filter((item) => item.type === "product")
    .map((item) => `${item.description} × ${item.quantity}`)
    .join(", ");
}

/**
 * Once a payment is settled: its receipt is issued, then what it pays for follows — the fee is
 * recorded (its email carries the receipt), a donation or an order gets its own thank-you with
 * the receipt, and the committee hears of new orders. Each step is safe to run twice.
 */
export async function afterPayment(paymentId: string, actor: { actorId: string | null; ipAddress: string | null }) {
  const [payment] = await db.select().from(payments).where(eq(payments.id, paymentId));
  if (!payment?.receiptNumber) return;
  try {
    await ensureReceipt(paymentId);
  } catch (error) {
    // The receipt is made again when it is downloaded; its email waits for it.
    console.error("[payments] receipt failed", payment.receiptNumber, error);
  }
  const reference = formatPaymentReference(payment.reference);

  if (payment.kind === "dues" && payment.memberId) {
    await recordDues({
      memberIds: [payment.memberId],
      paid: true,
      actorId: actor.actorId,
      ipAddress: actor.ipAddress,
      source: actor.actorId ? "manual" : "online",
      receipt: payment.receiptNumber,
    });
    return;
  }

  const recipient = await payerRecipient(payment);
  await enqueue("payment.receipt", [recipient], () => ({
    values: {
      amount: formatChf(payment.amount),
      what: WHAT[payment.kind][payment.locale].replace("{payment}", reference),
      receipt: payment.receiptNumber!,
      payment: reference,
    },
    path: payment.memberId ? "/espace-membre/paiements" : undefined,
    attachment: payment.receiptNumber!,
    dedupe: `payment.receipt:${payment.id}`,
  }));

  if (payment.kind === "shop") {
    const [order] = await db.select().from(orders).where(eq(orders.paymentId, payment.id));
    const items = await itemsSummary(payment.id);
    await enqueue("shop.newOrder", await committeeRecipients(), (committee) => ({
      values: {
        payment: reference,
        name: payment.payerName,
        amount: formatChf(payment.amount),
        items,
        delivery: order?.fulfilment === "shipping" ? { fr: "Envoi postal", en: "Shipping", de: "Postversand" }[committee.locale] : { fr: "Retrait à un événement", en: "Pick-up at an event", de: "Abholung an einem Event" }[committee.locale],
      },
      path: "/admin/finances/commandes",
      dedupe: `shop.newOrder:${payment.id}:${committee.email}`,
    }));
  }
}
