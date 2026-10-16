import "server-only";
import { and, inArray, lt } from "drizzle-orm";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { paymentsEnabled } from "@/lib/payments/stripe";
import { releaseExpiredHolds } from "@/lib/payments/shop";
import { retryFailedEvents } from "@/lib/payments/webhook";

/**
 * Every few minutes (with the mailing worker): provider events that failed are tried again,
 * pieces held by abandoned shop checkouts go back on the shelf, and checkouts left unpaid for a
 * day are closed (kept as cancelled attempts).
 */
export async function paymentHousekeeping() {
  if (!paymentsEnabled()) return;
  await retryFailedEvents();
  await releaseExpiredHolds();
  await db
    .update(payments)
    .set({ status: "canceled" })
    .where(and(inArray(payments.status, ["pending", "failed"]), lt(payments.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000))));
}
