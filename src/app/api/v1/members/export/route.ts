import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { members, user } from "@/db/schema";
import { apiHandler, parseBody } from "@/lib/api";
import { getClientIp, writeAuditLog } from "@/lib/audit";
import { isDuesPaid } from "@/lib/dues";
import { requireCapability } from "@/lib/permissions";
import { memberIdsSchema } from "@/lib/validators";

// Quotes every field; a leading = + - @ is defused so spreadsheets never run it as a formula.
const cell = (value: unknown) => {
  const text = value === null || value === undefined ? "" : String(value);
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
};

/** CSV of the members picked in the list (personal data: admins only, logged). */
export const POST = apiHandler(async (request) => {
  const session = await requireCapability("members.write");
  const { ids } = await parseBody(request, memberIdsSchema);
  const rows = await db
    .select({
      memberNumber: members.memberNumber,
      firstName: members.firstName,
      lastName: members.lastName,
      email: user.email,
      phone: members.phone,
      address: members.address,
      postcode: members.postcode,
      city: members.city,
      status: members.status,
      joinedOn: members.joinedOn,
      expiresOn: members.expiresOn,
      birthDate: members.birthDate,
      psgTicketing: members.psgTicketing,
      photoConsent: members.photoConsent,
      locale: members.locale,
    })
    .from(members)
    .innerJoin(user, eq(user.id, members.userId))
    .where(inArray(members.id, ids))
    .orderBy(asc(members.lastName), asc(members.firstName));

  const header = ["member_number", "first_name", "last_name", "email", "phone", "address", "postcode", "city", "status", "joined_on", "fee_paid_until", "fee_paid", "birth_date", "psg_ticketing", "photo_consent", "language"];
  const lines = rows.map((row) =>
    [
      row.memberNumber,
      row.firstName,
      row.lastName,
      row.email,
      row.phone,
      row.address,
      row.postcode,
      row.city,
      row.status,
      row.joinedOn,
      row.expiresOn,
      isDuesPaid(row) ? "yes" : "no",
      row.birthDate,
      row.psgTicketing,
      row.photoConsent === null ? "" : row.photoConsent ? "yes" : "no",
      row.locale,
    ]
      .map(cell)
      .join(","),
  );

  await writeAuditLog({
    actorId: session.user.id,
    action: "member.export",
    entityType: "member",
    metadata: { count: rows.length },
    ipAddress: getClientIp(request.headers),
  });

  // BOM so Excel opens the accents correctly.
  return new Response(`﻿${[header.join(","), ...lines].join("\r\n")}\r\n`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="membres-psg-zurich.csv"`,
      "cache-control": "no-store",
    },
  });
});
