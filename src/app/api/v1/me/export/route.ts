import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { auditLog, members, session as sessionTable, user } from "@/db/schema";
import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/permissions";

/** Everything stored about the signed-in member, as a JSON download (right of access / portability). */
export const GET = apiHandler(async () => {
  const session = await requireRole("member");
  const userId = session.user.id;

  const [account, profile, sessions, activity] = await Promise.all([
    // Never the password hash or session tokens.
    db
      .select({
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })
      .from(user)
      .where(eq(user.id, userId)),
    db
      .select({
        firstName: members.firstName,
        lastName: members.lastName,
        phone: members.phone,
        city: members.city,
        memberNumber: members.memberNumber,
        status: members.status,
        joinedOn: members.joinedOn,
        expiresOn: members.expiresOn,
        locale: members.locale,
        createdAt: members.createdAt,
        updatedAt: members.updatedAt,
      })
      .from(members)
      .where(eq(members.userId, userId)),
    db
      .select({
        createdAt: sessionTable.createdAt,
        expiresAt: sessionTable.expiresAt,
        ipAddress: sessionTable.ipAddress,
        userAgent: sessionTable.userAgent,
      })
      .from(sessionTable)
      .where(eq(sessionTable.userId, userId)),
    db
      .select({
        action: auditLog.action,
        metadata: auditLog.metadata,
        ipAddress: auditLog.ipAddress,
        createdAt: auditLog.createdAt,
      })
      .from(auditLog)
      .where(eq(auditLog.actorId, userId))
      .orderBy(desc(auditLog.createdAt)),
  ]);

  const body = {
    exportedAt: new Date().toISOString(),
    controller: "PSG Zurich Supporters Club — contact@psg-zurich.ch",
    account: account[0] ?? null,
    memberProfile: profile[0] ?? null,
    sessions,
    activity,
  };

  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": 'attachment; filename="psg-zurich-mes-donnees.json"',
      "cache-control": "no-store",
    },
  });
});
