import { z } from "zod";
import { apiHandler, ok, parseBody } from "@/lib/api";
import { getClientIp } from "@/lib/audit";
import { seasonEnd } from "@/lib/dues";
import { cancelDues, recordManualDues } from "@/lib/payments/manual";
import { requireCapability } from "@/lib/permissions";
import { memberIdsSchema } from "@/lib/validators";

const MANUAL_METHODS = ["bank_transfer", "cash", "twint_manual"] as const;

/**
 * Several fees at once (the fees page's selection): recorded as payments by hand, with a
 * receipt each, or cancelled (with a credit note) for the season.
 */
export const POST = apiHandler(async (request) => {
  const session = await requireCapability("members.write");
  const { ids, paid, method, note } = await parseBody(
    request,
    memberIdsSchema.extend({ paid: z.boolean(), method: z.enum(MANUAL_METHODS).default("bank_transfer"), note: z.string().trim().max(500).optional() }),
  );
  const actor = { actorId: session.user.id, ipAddress: getClientIp(request.headers) };
  if (paid) return ok({ ...(await recordManualDues(ids, method, actor, note)), expiresOn: seasonEnd(), online: [] as string[] });
  return ok({ ...(await cancelDues(ids, actor)), expiresOn: null });
});
