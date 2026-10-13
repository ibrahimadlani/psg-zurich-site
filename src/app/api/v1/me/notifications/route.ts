import { and, eq, isNull, lt, or } from "drizzle-orm";
import { db } from "@/db";
import { LOCALES, members, type Locale } from "@/db/schema";
import { apiHandler, ok } from "@/lib/api";
import { getNotifications, markNotificationsSeen } from "@/lib/notification-feed";
import { requireRole } from "@/lib/permissions";

/** The bell's feed for the signed-in user (`?locale=` picks the articles' language). */
export const GET = apiHandler(async (request) => {
  const session = await requireRole("member");
  const requested = request.nextUrl.searchParams.get("locale");
  const locale: Locale = (LOCALES as readonly string[]).includes(requested ?? "") ? (requested as Locale) : "fr";
  // Last visit, for the "we miss you" email (written at most once an hour).
  await db
    .update(members)
    .set({ lastSeenAt: new Date() })
    .where(and(eq(members.userId, session.user.id), or(isNull(members.lastSeenAt), lt(members.lastSeenAt, new Date(Date.now() - 3_600_000)))));
  return ok(await getNotifications(session.user.id, locale));
});

/** The bell was opened: everything up to now is read. */
export const POST = apiHandler(async () => {
  const session = await requireRole("member");
  await markNotificationsSeen(session.user.id);
  return ok({ seen: true });
});
