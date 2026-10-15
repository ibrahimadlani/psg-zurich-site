import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { members } from "@/db/schema";
import { apiHandler, ok, parseBody } from "@/lib/api";
import { getClientIp } from "@/lib/audit";
import { recordDues } from "@/lib/dues-record";
import { HttpError, requireCapability } from "@/lib/permissions";

type Context = RouteContext<"/api/v1/members/[id]/dues">;

/** The committee records (or cancels) the fee of an accepted member for the current season. */
export const POST = apiHandler<Context>(async (request, { params }) => {
  const session = await requireCapability("members.write");
  const { id } = await params;
  const { paid } = await parseBody(request, z.object({ paid: z.boolean() }));

  const [member] = await db.select({ status: members.status }).from(members).where(eq(members.id, id));
  if (!member) throw new HttpError(404, "not_found", "Member not found.");
  if (member.status !== "active") throw new HttpError(409, "invalid_status", "Only accepted members pay the fee.");

  const { expiresOn } = await recordDues({ memberIds: [id], paid, actorId: session.user.id, ipAddress: getClientIp(request.headers) });
  return ok({ expiresOn });
});
