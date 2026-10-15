import { connection } from "next/server";
import { apiHandler } from "@/lib/api";
import { getClientIp, writeAuditLog } from "@/lib/audit";
import { adminEventDetail } from "@/lib/admin/events-query";
import { HttpError, requireCapability } from "@/lib/permissions";

type Context = RouteContext<"/api/v1/events/[id]/attendees/export">;

// Quotes every field; a leading = + - @ is defused so spreadsheets never run it as a formula.
const cell = (value: unknown) => {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${(/^[=+\-@]/.test(text) ? `'${text}` : text).replaceAll('"', '""')}"`;
};

/** Sign-up list of an event as CSV (for the bus, the bar's booking…). */
export const GET = apiHandler<Context>(async (request, { params }) => {
  await connection();
  const session = await requireCapability("events");
  const { id } = await params;
  const detail = await adminEventDetail(id);
  if (!detail) throw new HttpError(404, "not_found", "Event not found.");

  const rows = detail.attendees.filter((person) => person.status !== "cancelled");
  const header = ["status", "member_number", "first_name", "last_name", "phone", "email", "present", "signed_up_at"];
  const lines = rows.map((person) =>
    [person.status, person.memberNumber, person.firstName, person.lastName, person.phone, person.email, person.checkedInAt ? "yes" : "", person.signedUpAt.toISOString()]
      .map(cell)
      .join(","),
  );
  await writeAuditLog({
    actorId: session.user.id,
    action: "event.export",
    entityType: "event",
    entityId: id,
    metadata: { count: rows.length },
    ipAddress: getClientIp(request.headers),
  });
  const slug = detail.event.title.normalize("NFD").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").toLowerCase().slice(0, 60) || "evenement";
  return new Response(`﻿${[header.join(","), ...lines].join("\r\n")}\r\n`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="inscrits-${slug}.csv"`,
      "cache-control": "no-store",
    },
  });
});
