import { eq } from "drizzle-orm";
import { db } from "@/db";
import { members, user } from "@/db/schema";
import { apiHandler, ok, parseBody } from "@/lib/api";
import { getClientIp, writeAuditLog } from "@/lib/audit";
import { todayInZurich } from "@/lib/dues";
import { recordDues } from "@/lib/dues-record";
import { onMemberDecision } from "@/lib/mailing/triggers";
import { nextMemberNumber } from "@/lib/member-number";
import { HttpError, requireCapability } from "@/lib/permissions";
import { memberAdminSchema } from "@/lib/validators";

type Context = RouteContext<"/api/v1/members/[id]">;

/**
 * The committee acts on a member:
 * - `decision`: approve (from pending or rejected; `withDues` records the fee in the same go)
 *   or reject (from pending; `reason` is kept in the audit log, for the committee only);
 * - `action`: suspend an accepted member, or reinstate a suspended one;
 * - `profile`: correct names, contact details, birth date and email language.
 */
export const PATCH = apiHandler<Context>(async (request, { params }) => {
  const session = await requireCapability("members.write");
  const { id } = await params;
  const input = await parseBody(request, memberAdminSchema);
  const ipAddress = getClientIp(request.headers);

  const [current] = await db
    .select({ status: members.status, memberNumber: members.memberNumber, emailVerified: user.emailVerified })
    .from(members)
    .innerJoin(user, eq(user.id, members.userId))
    .where(eq(members.id, id));
  if (!current) throw new HttpError(404, "not_found", "Member not found.");

  const audit = (action: string, metadata: Record<string, unknown>, tx?: Parameters<typeof writeAuditLog>[1]) =>
    writeAuditLog({ actorId: session.user.id, action, entityType: "member", entityId: id, metadata, ipAddress }, tx);
  const fresh = async () => (await db.select().from(members).where(eq(members.id, id)))[0];

  if ("profile" in input) {
    const { birthDate, ...profile } = input.profile;
    await db.transaction(async (tx) => {
      await tx
        .update(members)
        .set({ ...profile, phone: profile.phone || null, address: profile.address || null, postcode: profile.postcode || null, city: profile.city || null, birthDate: birthDate || null })
        .where(eq(members.id, id));
      await audit("member.update", { fields: Object.keys(input.profile) }, tx);
    });
    return ok(await fresh());
  }

  if ("action" in input) {
    const [from, to] = input.action === "suspend" ? (["active", "suspended"] as const) : (["suspended", "active"] as const);
    if (current.status !== from) throw new HttpError(409, "invalid_status", `Only ${from} members can be changed this way.`);
    await db.transaction(async (tx) => {
      await tx.update(members).set({ status: to }).where(eq(members.id, id));
      await audit(input.action === "suspend" ? "member.suspend" : "member.reactivate", { from }, tx);
    });
    return ok(await fresh());
  }

  const { decision, withDues, reason } = input;
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

  await db.transaction(async (tx) => {
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
    await audit(decision === "approve" ? "member.approve" : "member.reject", { from: current.status, ...(reason ? { reason } : {}) }, tx);
  });

  await onMemberDecision(id, decision === "approve" ? "approved" : "rejected");
  if (decision === "approve" && withDues) await recordDues({ memberIds: [id], paid: true, actorId: session.user.id, ipAddress });
  return ok(await fresh());
});
