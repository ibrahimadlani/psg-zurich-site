import { and, asc, eq, like, or } from "drizzle-orm";
import { connection } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { members, user } from "@/db/schema";
import { apiHandler, ok, parseQuery } from "@/lib/api";
import { isDuesPaid } from "@/lib/dues";
import { requireCapability } from "@/lib/permissions";

/**
 * Quick member search by name, email or number (the scanner's "card forgotten", adding someone
 * to an event): accepted members only, a handful of results.
 */
export const GET = apiHandler(async (request) => {
  await connection();
  await requireCapability("scan");
  const { q } = parseQuery(request, z.object({ q: z.string().trim().min(2).max(80) }));
  const words = q.split(/\s+/).slice(0, 3);
  const rows = await db
    .select({
      id: members.id,
      firstName: members.firstName,
      lastName: members.lastName,
      memberNumber: members.memberNumber,
      status: members.status,
      expiresOn: members.expiresOn,
      image: user.image,
      email: user.email,
    })
    .from(members)
    .innerJoin(user, eq(user.id, members.userId))
    .where(
      and(
        eq(members.status, "active"),
        ...words.map((word) => {
          const pattern = `%${word.replace(/[%_\\]/g, "\\$&")}%`;
          return or(like(members.firstName, pattern), like(members.lastName, pattern), like(user.email, pattern), like(members.memberNumber, pattern));
        }),
      ),
    )
    .orderBy(asc(members.lastName), asc(members.firstName))
    .limit(8);
  return ok(
    rows.map(({ expiresOn, status, ...row }) => ({
      ...row,
      name: `${row.firstName} ${row.lastName}`.trim(),
      paid: isDuesPaid({ status, expiresOn }),
    })),
  );
});
