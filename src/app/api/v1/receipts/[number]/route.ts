import { eq } from "drizzle-orm";
import { db } from "@/db";
import { payments, receipts, refunds } from "@/db/schema";
import { apiHandler } from "@/lib/api";
import { getCurrentMember } from "@/lib/members";
import { ensureCreditNote, ensureReceipt } from "@/lib/payments/receipts";
import { getSession, HttpError } from "@/lib/permissions";
import { can } from "@/lib/roles";

type Context = RouteContext<"/api/v1/receipts/[number]">;

/**
 * A receipt (Q-…) or credit note (A-…) as PDF, as issued. For the member it belongs to and the
 * committee's finances; anyone else gets a 404 (the number tells nothing).
 */
export const GET = apiHandler<Context>(async (request, { params }) => {
  const number = (await params).number.toUpperCase();
  if (!/^[QA]-\d{4}-\d{4,}$/.test(number)) throw new HttpError(404, "not_found", "Document not found.");
  const [session, member] = await Promise.all([getSession(), getCurrentMember()]);
  if (!session) throw new HttpError(404, "not_found", "Document not found.");

  const [payment] = number.startsWith("Q")
    ? await db.select().from(payments).where(eq(payments.receiptNumber, number))
    : await db
        .select({ payments })
        .from(refunds)
        .innerJoin(payments, eq(payments.id, refunds.paymentId))
        .where(eq(refunds.creditNoteNumber, number))
        .then((rows) => rows.map((row) => row.payments));
  const allowed = payment && (can(session.user.role, "finances") || (member !== null && payment.memberId === member.id));
  if (!allowed) throw new HttpError(404, "not_found", "Document not found.");

  // Issued on the spot if its first making failed; afterwards always the same file.
  let [document] = await db.select().from(receipts).where(eq(receipts.number, number));
  if (!document) {
    if (number.startsWith("Q")) document = (await ensureReceipt(payment.id)) ?? undefined;
    else {
      const [refund] = await db.select({ id: refunds.id }).from(refunds).where(eq(refunds.creditNoteNumber, number));
      document = refund ? ((await ensureCreditNote(refund.id)) ?? undefined) : undefined;
    }
  }
  if (!document) throw new HttpError(404, "not_found", "Document not found.");
  const download = request.nextUrl.searchParams.has("download");
  return new Response(new Uint8Array(document.pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `${download ? "attachment" : "inline"}; filename="${number}.pdf"`,
      "cache-control": "private, no-store",
      "x-content-sha256": document.sha256,
    },
  });
});
