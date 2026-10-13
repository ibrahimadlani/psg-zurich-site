import { eq } from "drizzle-orm";
import { db } from "@/db";
import { members, user } from "@/db/schema";
import { apiHandler, ok, parseBody } from "@/lib/api";
import { getClientIp, writeAuditLog } from "@/lib/audit";
import { todayInZurich } from "@/lib/dues";
import { onMemberDecision } from "@/lib/mailing/triggers";
import { nextMemberNumber } from "@/lib/member-number";
import { HttpError, requireRole } from "@/lib/permissions";
import { memberDecisionSchema } from "@/lib/validators";

type Context = RouteContext<"/api/v1/members/[id]">;

/** Committee decision on a membership request: approve (from pending or rejected) or reject (from pending). */
export const PATCH = apiHandler<Context>(async (request, { params }) => {
  const session = await requireRole("admin");
  const { id } = await params;
  const { decision } = await parseBody(request, memberDecisionSchema);

  const [current] = await db
    .select({ status: members.status, memberNumber: members.memberNumber, emailVerified: user.emailVerified })
    .from(members)
    .innerJoin(user, eq(user.id, members.userId))
    .where(eq(members.id, id));
  if (!current) throw new HttpError(404, "not_found", "Member not found.");

  if (decision === "approve") {
    if (current.status !== "pending" && current.status !== "rejected") {
      throw new HttpError(409, "invalid_status", "Only pending or rejected requests can be approved.");
    }
    if (!current.emailVerified) {
      throw new HttpError(409, "email_not_verified", "The applicant has not confirmed their email address yet.");
    }
  } else if (current.status !== "pending") {
    throw new HttpError(409, "invalid_status", "Only pending requests can be rejected.");
  }

  const updated = await db.transaction(async (tx) => {
    if (decision === "approve") {
      await tx
        .update(members)
        .set({
          status: "active",
          joinedOn: todayInZurich(),
          memberNumber: current.memberNumber ?? (await nextMemberNumber(tx)),
        })
        .where(eq(members.id, id));
    } else {
      await tx.update(members).set({ status: "rejected" }).where(eq(members.id, id));
    }
    await writeAuditLog(
      {
        actorId: session.user.id,
        action: decision === "approve" ? "member.approve" : "member.reject",
        entityType: "member",
        entityId: id,
        metadata: { from: current.status },
        ipAddress: getClientIp(request.headers),
      },
      tx,
    );
    const [row] = await tx.select().from(members).where(eq(members.id, id));
    return row;
  });

  await onMemberDecision(id, decision === "approve" ? "approved" : "rejected");
  return ok(updated);
});
