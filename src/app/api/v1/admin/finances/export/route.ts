import { z } from "zod";
import { LOCALES } from "@/db/schema";
import { apiHandler, parseQuery } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { yearCsv, yearReportPdf } from "@/lib/payments/ledger";
import { requireCapability } from "@/lib/permissions";

/** The year's journal (CSV) or its one-page report (PDF), for the treasurer and the auditors. */
export const GET = apiHandler(async (request) => {
  const session = await requireCapability("finances");
  const { year, format, locale } = parseQuery(
    request,
    z.object({ year: z.string().regex(/^\d{4}\/\d{2}$/), format: z.enum(["csv", "pdf"]).default("csv"), locale: z.enum(LOCALES).default("fr") }),
  );
  await writeAuditLog({ actorId: session.user.id, action: "payment.export", entityType: "ledger", entityId: null, metadata: { year, format }, ipAddress: null });
  const name = `psg-zurich-${year.replace("/", "-")}`;
  if (format === "pdf") {
    const pdf = await yearReportPdf(year, locale);
    return new Response(new Uint8Array(pdf), { headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="${name}.pdf"`, "cache-control": "private, no-store" } });
  }
  return new Response(await yearCsv(year, locale), {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${name}.csv"`, "cache-control": "private, no-store" },
  });
});
