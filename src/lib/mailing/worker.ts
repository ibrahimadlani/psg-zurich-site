import "server-only";
import { and, asc, count, eq, gte, inArray, lt, lte, ne, notLike } from "drizzle-orm";
import { db } from "@/db";
import { auditLog, contactThreads, emailCampaigns, emailJobs, members, receipts, type EmailJobStatus } from "@/db/schema";
import { sendMail } from "@/lib/mail";
import { stillRelevant } from "@/lib/mailing/guards";
import { getMailingSettings } from "@/lib/mailing/queue";
import { jobCategory, renderJob } from "@/lib/mailing/render";

type Job = typeof emailJobs.$inferSelect;

const MAX_ATTEMPTS = 3;
const DAY = 24 * 60 * 60 * 1000;

const CONSENT = {
  events: "notifyEvents",
  reminders: "notifyPredictionReminders",
  results: "notifyResults",
  news: "notifyNews",
} as const;

/** The member still wants this category of email (transactional ones always go). */
async function consents(job: Job) {
  const category = jobCategory(job);
  if (category === "transactional" || !job.memberId) return true;
  const [member] = await db.select().from(members).where(eq(members.id, job.memberId));
  return Boolean(member?.[CONSENT[category]]);
}

const finish = (id: string, status: EmailJobStatus, extra: Partial<Job> = {}) =>
  db.update(emailJobs).set({ status, ...extra }).where(eq(emailJobs.id, id));

async function receiptPdf(number: string) {
  const [row] = await db.select({ pdf: receipts.pdf }).from(receipts).where(eq(receipts.number, number));
  return row ? { filename: `${number}.pdf`, content: row.pdf, contentType: "application/pdf" } : null;
}

/** Sends one job (already locked as "sending"). */
export async function deliver(job: Job) {
  if (!(await consents(job)) || !(await stillRelevant(job))) return finish(job.id, "skipped");
  try {
    const email = await renderJob(job);
    if (!email) return finish(job.id, "skipped", { lastError: "no texts" });
    // Receipts and credit notes go along as PDF (as issued, never redrawn).
    const attachment = job.payload.attachment ? await receiptPdf(job.payload.attachment) : null;
    if (job.payload.attachment && !attachment) throw new Error(`document ${job.payload.attachment} not issued yet`);
    await sendMail({ to: job.toEmail, ...email, attachments: attachment ? [attachment] : undefined });
    await finish(job.id, "sent", { sentAt: new Date(), attempts: job.attempts + 1 });
  } catch (error) {
    const attempts = job.attempts + 1;
    const message = error instanceof Error ? error.message : String(error);
    // Retry later (5, then 10 minutes), then give up.
    await finish(job.id, attempts >= MAX_ATTEMPTS ? "failed" : "pending", {
      attempts,
      lastError: message.slice(0, 500),
      sendAfter: new Date(Date.now() + attempts * 5 * 60_000),
    });
  }
}

/** Sends what is due, within the pace and the daily cap; does nothing while paused. */
export async function processQueue() {
  const settings = await getMailingSettings();
  if (settings.paused) return;
  const since = new Date(Date.now() - DAY);
  const [sentRow] = await db
    .select({ value: count() })
    .from(emailJobs)
    .where(and(eq(emailJobs.status, "sent"), gte(emailJobs.sentAt, since)));
  const sentToday = sentRow?.value ?? 0;
  const room = Math.min(settings.perMinute, settings.dailyCap - sentToday);
  if (room <= 0) return;

  const due = await db
    .select()
    .from(emailJobs)
    .where(and(eq(emailJobs.status, "pending"), lte(emailJobs.sendAfter, new Date())))
    .orderBy(asc(emailJobs.sendAfter))
    .limit(room);

  for (const job of due) {
    // Lock: if another server process took it first, skip it.
    const [result] = await db
      .update(emailJobs)
      .set({ status: "sending" })
      .where(and(eq(emailJobs.id, job.id), eq(emailJobs.status, "pending")));
    if (result.affectedRows !== 1) continue;
    await deliver(job);
  }
  await finishCampaigns();
}

/** Campaigns whose jobs are all done are marked sent, with their count. */
async function finishCampaigns() {
  const sending = await db.select({ id: emailCampaigns.id }).from(emailCampaigns).where(eq(emailCampaigns.status, "sending"));
  for (const campaign of sending) {
    const [openRow] = await db
      .select({ value: count() })
      .from(emailJobs)
      .where(and(eq(emailJobs.campaignId, campaign.id), eq(emailJobs.status, "pending")));
    if ((openRow?.value ?? 0) > 0) continue;
    const [sentRow] = await db
      .select({ value: count() })
      .from(emailJobs)
      .where(and(eq(emailJobs.campaignId, campaign.id), eq(emailJobs.status, "sent")));
    await db.update(emailCampaigns).set({ status: "sent", sentCount: sentRow?.value ?? 0 }).where(eq(emailCampaigns.id, campaign.id));
  }
}

/**
 * Jobs stuck in "sending" (server stopped mid-way) go back to the queue; history over 90 days
 * goes, and the admin's audit log after 2 years (as the privacy policy says).
 */
export async function cleanUpJobs() {
  await db
    .update(emailJobs)
    .set({ status: "pending" })
    .where(and(eq(emailJobs.status, "sending"), lt(emailJobs.sendAfter, new Date(Date.now() - 15 * 60_000))));
  await db.delete(emailJobs).where(lt(emailJobs.createdAt, new Date(Date.now() - 90 * DAY)));
  // Except the sign-up line (it proves consent to the statutes and the privacy policy, kept as
  // long as the account exists) and the money lines, kept 10 years with the books (CO 958f).
  await db
    .delete(auditLog)
    .where(and(lt(auditLog.createdAt, new Date(Date.now() - 730 * DAY)), ne(auditLog.action, "member.signup"), notLike(auditLog.action, "payment.%"), notLike(auditLog.action, "refund.%")));
  // Contact messages: 2 years after the last word of a finished conversation, spam after 30 days.
  await db
    .delete(contactThreads)
    .where(and(inArray(contactThreads.status, ["closed", "answered"]), lt(contactThreads.lastMessageAt, new Date(Date.now() - 730 * DAY))));
  await db.delete(contactThreads).where(and(eq(contactThreads.status, "spam"), lt(contactThreads.createdAt, new Date(Date.now() - 30 * DAY))));
}
