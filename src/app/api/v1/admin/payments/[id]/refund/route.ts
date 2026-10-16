import { z } from "zod";
import { apiHandler, ok, parseBody } from "@/lib/api";
import { getClientIp } from "@/lib/audit";
import { refundPayment } from "@/lib/payments/refund";
import { requireCapability } from "@/lib/permissions";

type Context = RouteContext<"/api/v1/admin/payments/[id]/refund">;

/** Gives all or part of a payment back, with a reason (on the credit note and in the journal). */
export const POST = apiHandler<Context>(async (request, { params }) => {
  const session = await requireCapability("finances");
  const { id } = await params;
  const { amount, reason } = await parseBody(request, z.object({ amount: z.number().int().min(1), reason: z.string().trim().min(3).max(500) }));
  const refund = await refundPayment({ paymentId: id, amount, reason, actorId: session.user.id, ipAddress: getClientIp(request.headers) });
  return ok({ id: refund.id, status: refund.status, creditNoteNumber: refund.creditNoteNumber });
});
