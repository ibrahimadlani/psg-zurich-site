import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { members } from "@/db/schema";
import { apiHandler, ok, parseBody } from "@/lib/api";
import { getClientIp } from "@/lib/audit";
import { seasonEnd } from "@/lib/dues";
import { cancelDues, recordManualDues } from "@/lib/payments/manual";
import { HttpError, requireCapability } from "@/lib/permissions";

type Context = RouteContext<"/api/v1/members/[id]/dues">;

/**
 * The committee records (or cancels) the fee of an accepted member for the current season: a
 * payment by hand with its receipt, or its reversal with a credit note.
 */
export const POST = apiHandler<Context>(async (request, { params }) => {
  const session = await requireCapability("members.write");
  const { id } = await params;
  const { paid, method } = await parseBody(request, z.object({ paid: z.boolean(), method: z.enum(["bank_transfer", "cash", "twint_manual"]).default("bank_transfer") }));

  const [member] = await db.select({ status: members.status }).from(members).where(eq(members.id, id));
  if (!member) throw new HttpError(404, "not_found", "Member not found.");
  if (member.status !== "active") throw new HttpError(409, "invalid_status", "Only accepted members pay the fee.");

  const actor = { actorId: session.user.id, ipAddress: getClientIp(request.headers) };
  if (paid) {
    await recordManualDues([id], method, actor);
    return ok({ expiresOn: seasonEnd() });
  }
  const { online } = await cancelDues([id], actor);
  if (online.length) throw new HttpError(409, "paid_online", "Paid online: refund it from Finances.");
  return ok({ expiresOn: null });
});
