import { LOCALES, type Locale } from "@/db/schema";
import { apiHandler, ok } from "@/lib/api";
import { getNotifications, markNotificationsSeen } from "@/lib/notification-feed";
import { requireRole } from "@/lib/permissions";

/** The bell's feed for the signed-in user (`?locale=` picks the articles' language). */
export const GET = apiHandler(async (request) => {
  const session = await requireRole("member");
  const requested = request.nextUrl.searchParams.get("locale");
  const locale: Locale = (LOCALES as readonly string[]).includes(requested ?? "") ? (requested as Locale) : "fr";
  return ok(await getNotifications(session.user.id, locale));
});

/** The bell was opened: everything up to now is read. */
export const POST = apiHandler(async () => {
  const session = await requireRole("member");
  await markNotificationsSeen(session.user.id);
  return ok({ seen: true });
});
