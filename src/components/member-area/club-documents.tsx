import { FileText, Image as ImageIcon } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { documentUrl, listDocuments, type DocumentRow } from "@/lib/documents";

const label = "font-wide text-[10px] font-semibold tracking-[0.08em] uppercase";

/** File size as people say it: "240 ko", "1,2 Mo". */
export function fileSize(bytes: number, format: Awaited<ReturnType<typeof getFormatter>>) {
  return bytes < 1024 * 1024
    ? format.number(Math.max(1, Math.round(bytes / 1024)), { style: "unit", unit: "kilobyte", unitDisplay: "short" })
    : format.number(bytes / (1024 * 1024), { style: "unit", unit: "megabyte", unitDisplay: "short", maximumFractionDigits: 1 });
}

/** Statutes, minutes, rules…: the club's documents for members, grouped by category. */
export async function ClubDocuments() {
  const [t, format] = await Promise.all([getTranslations("Documents"), getFormatter()]);
  const rows = await listDocuments(["public", "members"]);
  if (rows.length === 0) return null;
  const groups = new Map<string, DocumentRow[]>();
  for (const row of rows) {
    const key = row.category ?? t("other");
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }

  return (
    <section className="space-y-3" aria-labelledby="documents">
      <h2 id="documents" className={`${label} text-muted-foreground`}>
        {t("title")}
      </h2>
      <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
        {[...groups.entries()].map(([category, list]) => (
          <div key={category} className="space-y-1.5">
            <h3 className="text-[13px] font-semibold">{category}</h3>
            <ul className="divide-y border-y">
              {list.map((document) => {
                const Icon = document.mimeType === "application/pdf" ? FileText : ImageIcon;
                return (
                  <li key={document.id}>
                    <a href={documentUrl(document.id)} target="_blank" rel="noreferrer" className="group flex items-center gap-3 py-2.5">
                      <Icon className="size-4 shrink-0 text-psg-red" aria-hidden />
                      <span className="min-w-0 flex-1 truncate text-[15px] group-hover:underline">{document.title}</span>
                      <span className="shrink-0 text-[12px] text-muted-foreground tabular-nums">
                        {format.dateTime(document.createdAt, { month: "short", year: "numeric" })} · {fileSize(document.sizeBytes, format)}
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
