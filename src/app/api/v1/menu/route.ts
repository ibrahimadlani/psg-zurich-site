import { and, count, desc, eq, gte, lte } from "drizzle-orm";
import { connection } from "next/server";
import { db } from "@/db";
import { events, posts } from "@/db/schema";
import { apiHandler, ok } from "@/lib/api";
import { eventAccess } from "@/lib/dues";
import { getCurrentMember } from "@/lib/members";
import { getSession } from "@/lib/permissions";

/**
 * What the mobile menu shows besides links (read when it opens, from the database only):
 * where the visitor stands, when the latest article came out (the menu compares it with the
 * last visit to /actualites), and the number of upcoming events for members whose fee is paid.
 */
export const GET = apiHandler(async () => {
  await connection();
  const now = new Date();
  const [session, latest] = await Promise.all([
    getSession(),
    db
      .select({ publishedAt: posts.publishedAt })
      .from(posts)
      .where(and(eq(posts.status, "published"), lte(posts.publishedAt, now)))
      .orderBy(desc(posts.publishedAt))
      .limit(1),
  ]);
  const member = session ? await getCurrentMember() : null;
  const access = eventAccess(Boolean(session), member);
  const [upcoming] =
    access === "full" ? await db.select({ value: count() }).from(events).where(gte(events.startsAt, now)) : [null];

  return ok({
    access,
    latestNewsAt: latest[0]?.publishedAt ?? null,
    upcomingEvents: upcoming?.value ?? null,
  });
});
