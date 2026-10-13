import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { members } from "@/db/schema";
import { apiHandler, ok, parseBody } from "@/lib/api";
import { getClientIp, writeAuditLog } from "@/lib/audit";
import { seasonEnd } from "@/lib/dues";
import { HttpError, requireRole } from "@/lib/permissions";

type Context = RouteContext<"/api/v1/members/[id]/dues">;

/** The committee records (or cancels) the fee of an accepted member for the current season. */
export const POST = apiHandler<Context>(async (request, { params }) => {
  const session = await requireRole("admin");
  const { id } = await params;
  const { paid } = await parseBody(request, z.object({ paid: z.boolean() }));

  const [member] = await db.select({ status: members.status }).from(members).where(eq(members.id, id));
  if (!member) throw new HttpError(404, "not_found", "Member not found.");
  if (member.status !== "active") throw new HttpError(409, "invalid_status", "Only accepted members pay the fee.");

  const expiresOn = paid ? seasonEnd() : null;
  await db.transaction(async (tx) => {
    await tx.update(members).set({ expiresOn }).where(eq(members.id, id));
    await writeAuditLog(
      {
        actorId: session.user.id,
        action: paid ? "member.dues_paid" : "member.dues_cancelled",
        entityType: "member",
        entityId: id,
        metadata: { expiresOn },
        ipAddress: getClientIp(request.headers),
      },
      tx,
    );
  });
  return ok({ expiresOn });
});
