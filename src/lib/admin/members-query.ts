import "server-only";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { attendance, auditLog, events, members, user } from "@/db/schema";
import { isDuesPaid, isJunior } from "@/lib/dues";

/** Everything the member list filters on (the club has a few hundred members: filtered in the browser). */
export async function listMembers() {
  const rows = await db
    .select({
      id: members.id,
      firstName: members.firstName,
      lastName: members.lastName,
      email: user.email,
      emailVerified: user.emailVerified,
      image: user.image,
      phone: members.phone,
      city: members.city,
      status: members.status,
      memberNumber: members.memberNumber,
      joinedOn: members.joinedOn,
      expiresOn: members.expiresOn,
      birthDate: members.birthDate,
      interests: members.interests,
      psgTicketing: members.psgTicketing,
      photoConsent: members.photoConsent,
      createdAt: members.createdAt,
    })
    .from(members)
    .innerJoin(user, eq(user.id, members.userId))
    .orderBy(asc(members.lastName), asc(members.firstName));
  return rows.map(({ birthDate, expiresOn, ...row }) => ({
    ...row,
    paid: isDuesPaid({ status: row.status, expiresOn }),
    expiresOn,
    junior: isJunior(birthDate),
    interests: row.interests ?? [],
  }));
}
export type MemberRow = Awaited<ReturnType<typeof listMembers>>[number];

/** One member with the account, recent events and the committee's actions on them. */
export async function memberDetail(id: string) {
  const [row] = await db
    .select({
      member: members,
      email: user.email,
      emailVerified: user.emailVerified,
      image: user.image,
      role: user.role,
      accountCreatedAt: user.createdAt,
    })
    .from(members)
    .innerJoin(user, eq(user.id, members.userId))
    .where(eq(members.id, id));
  if (!row) return null;

  const [history, attended] = await Promise.all([
    db
      .select({ id: auditLog.id, action: auditLog.action, metadata: auditLog.metadata, createdAt: auditLog.createdAt, actorName: user.name, actorEmail: user.email })
      .from(auditLog)
      .leftJoin(user, eq(user.id, auditLog.actorId))
      .where(and(eq(auditLog.entityType, "member"), eq(auditLog.entityId, id)))
      .orderBy(desc(auditLog.createdAt))
      .limit(20),
    db
      .select({
        eventId: events.id,
        title: events.title,
        startsAt: events.startsAt,
        status: attendance.status,
        checkedInAt: attendance.checkedInAt,
      })
      .from(attendance)
      .innerJoin(events, eq(events.id, attendance.eventId))
      .where(and(eq(attendance.memberId, id), inArray(attendance.status, ["registered", "waitlisted", "cancelled", "attended"])))
      .orderBy(desc(events.startsAt))
      .limit(10),
  ]);

  return { ...row, history, attended };
}
