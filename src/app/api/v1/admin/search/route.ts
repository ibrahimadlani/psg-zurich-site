import { and, desc, eq, like, or } from "drizzle-orm";
import { connection } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { events, members, posts, user } from "@/db/schema";
import { apiHandler, ok, parseQuery } from "@/lib/api";
import { requireCapability } from "@/lib/permissions";
import { can } from "@/lib/roles";

/** `%word%` with the LIKE wildcards of the word itself escaped. */
const pattern = (word: string) => `%${word.replace(/[%_\\]/g, "\\$&")}%`;

/**
 * The admin's quick search (⌘K): members, events and articles matching every word, a few of
 * each, only in the sections the role may open.
 */
export const GET = apiHandler(async (request) => {
  await connection();
  const session = await requireCapability("area");
  const role = session.user.role;
  const { q } = parseQuery(request, z.object({ q: z.string().trim().min(2).max(80) }));
  const words = q.split(/\s+/).slice(0, 3);

  const [memberRows, eventRows, postRows] = await Promise.all([
    can(role, "members.read")
      ? db
          .select({ id: members.id, firstName: members.firstName, lastName: members.lastName, memberNumber: members.memberNumber, status: members.status, email: user.email, image: user.image })
          .from(members)
          .innerJoin(user, eq(user.id, members.userId))
          .where(and(...words.map((word) => or(like(members.firstName, pattern(word)), like(members.lastName, pattern(word)), like(user.email, pattern(word)), like(members.memberNumber, pattern(word))))))
          .limit(5)
      : [],
    can(role, "events")
      ? db
          .select({ id: events.id, title: events.title, startsAt: events.startsAt })
          .from(events)
          .where(and(...words.map((word) => or(like(events.title, pattern(word)), like(events.location, pattern(word))))))
          .orderBy(desc(events.startsAt))
          .limit(5)
      : [],
    can(role, "news")
      ? db
          .select({ id: posts.id, title: posts.title, locale: posts.locale })
          .from(posts)
          .where(and(...words.map((word) => like(posts.title, pattern(word)))))
          .orderBy(desc(posts.updatedAt))
          .limit(5)
      : [],
  ]);

  return ok({
    members: memberRows.map((row) => ({ ...row, name: `${row.firstName} ${row.lastName}`.trim() })),
    events: eventRows,
    posts: postRows,
  });
});
