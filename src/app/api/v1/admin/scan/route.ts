import { and, eq, gte, lte, sql } from "drizzle-orm";
import { connection } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { attendance, events, members, user } from "@/db/schema";
import { apiHandler, ok, parseQuery } from "@/lib/api";
import { isDuesPaid, isJunior } from "@/lib/dues";
import { memberByCardToken } from "@/lib/member-card";
import { requireCapability } from "@/lib/permissions";

const HOUR = 60 * 60 * 1000;

const query = z.object({
  event: z.string().max(36).optional(),
  token: z.string().max(64).optional(),
  member: z.string().max(36).optional(),
});

/** Door count of an event: present, signed up, places. */
async function presence(eventId: string) {
  const [event] = await db.select({ capacity: events.capacity }).from(events).where(eq(events.id, eventId));
  const [row] = await db
    .select({
      registered: sql<number>`sum(${attendance.status} = 'registered')`,
      present: sql<number>`sum(${attendance.checkedInAt} is not null)`,
    })
    .from(attendance)
    .where(eq(attendance.eventId, eventId));
  return { capacity: event?.capacity ?? null, registered: Number(row?.registered ?? 0), present: Number(row?.present ?? 0) };
}

/**
 * For the scanner. Without a member: the events from 12 hours ago to a week ahead (to pick one)
 * and the door count of `event`. With a scanned `token` (or a `member` found by name): who it is,
 * whether they may come in, and where they stand for `event`.
 */
export const GET = apiHandler(async (request) => {
  await connection();
  await requireCapability("scan");
  const { event: eventId, token, member: memberId } = parseQuery(request, query);
  const now = Date.now();

  const around = await db
    .select({ id: events.id, title: events.title, startsAt: events.startsAt, location: events.location })
    .from(events)
    .where(and(gte(events.startsAt, new Date(now - 12 * HOUR)), lte(events.startsAt, new Date(now + 7 * 24 * HOUR))))
    .orderBy(events.startsAt);
  const count = eventId ? await presence(eventId) : null;

  if (!token && !memberId) return ok({ events: around, count, member: null });

  const found = token ? await memberByCardToken(token) : (await db.select().from(members).where(eq(members.id, memberId!)))[0];
  if (!found) return ok({ events: around, count, member: null, unknown: true });
  const [account] = await db.select({ image: user.image }).from(user).where(eq(user.id, found.userId));
  const [signUp] = eventId
    ? await db
        .select({ status: attendance.status, checkedInAt: attendance.checkedInAt })
        .from(attendance)
        .where(and(eq(attendance.eventId, eventId), eq(attendance.memberId, found.id)))
    : [];

  return ok({
    events: around,
    count,
    member: {
      id: found.id,
      name: `${found.firstName} ${found.lastName}`.trim(),
      memberNumber: found.memberNumber,
      image: account?.image ?? null,
      state: found.status !== "active" ? "notAccepted" : isDuesPaid(found) ? "paid" : "unpaid",
      junior: isJunior(found.birthDate),
      photoConsent: found.photoConsent === true,
      signUp: signUp ? { status: signUp.status, checkedInAt: signUp.checkedInAt } : null,
    },
  });
});
