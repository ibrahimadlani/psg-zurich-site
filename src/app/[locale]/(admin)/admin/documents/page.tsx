import { FileText, Image as ImageIcon } from "lucide-react";
import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { DocumentActions, UploadDocumentButton } from "@/components/admin/documents/document-admin";
import { AdminForbidden, AdminHeader } from "@/components/admin/ui/admin-header";
import { StatusPill } from "@/components/admin/ui/status-pill";
import { adminLabel } from "@/components/admin/ui/styles";
import { fileSize } from "@/components/member-area/club-documents";
import { AdminListSkeleton } from "@/components/skeletons";
import { adminPage } from "@/lib/admin/guard";
import { documentUrl, listDocuments, type DocumentRow } from "@/lib/documents";
import { Streamed } from "@/components/ui/streamed";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("AdminShell");
  return { title: t("sections.documents"), robots: { index: false } };
}

async function Documents() {
  await connection();
  const [t, tShell, format] = await Promise.all([getTranslations("AdminDocuments"), getTranslations("AdminShell"), getFormatter()]);
  const session = await adminPage("documents");
  if (!session) return <AdminForbidden message={(await getTranslations("Admin"))("forbidden")} />;
  const rows = await listDocuments(["public", "members", "admins"]);
  const categories = [...new Set(rows.map((row) => row.category).filter((value): value is string => Boolean(value)))].sort();
  const groups = new Map<string, DocumentRow[]>();
  for (const row of rows) groups.set(row.category ?? "", [...(groups.get(row.category ?? "") ?? []), row]);

  return (
    <>
      <AdminHeader title={tShell("sections.documents")} description={t("description")} actions={<UploadDocumentButton categories={categories} />} />
      {rows.length ? (
        <div className="space-y-8">
          {[...groups.entries()].map(([category, list]) => (
            <section key={category} className="space-y-3">
              <h2 className={adminLabel}>{category || t("uncategorised")}</h2>
              <ul className="divide-y overflow-hidden rounded-[14px] border bg-card">
                {list.map((row) => {
                  const Icon = row.mimeType === "application/pdf" ? FileText : ImageIcon;
                  return (
                    <li key={row.id} className="flex items-center gap-3 p-3.5">
                      <Icon className="size-5 shrink-0 text-psg-red" aria-hidden />
                      <a href={documentUrl(row.id)} target="_blank" rel="noreferrer" className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-semibold hover:underline">{row.title}</span>
                        <span className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[12px] text-muted-foreground">
                          <StatusPill tone={row.visibility === "public" ? "brand" : row.visibility === "admins" ? "warn" : "neutral"}>{t(`visibilities.${row.visibility}`)}</StatusPill>
                          {format.dateTime(row.createdAt, { dateStyle: "medium" })} · {fileSize(row.sizeBytes, format)}
                        </span>
                      </a>
                      <DocumentActions id={row.id} initial={{ title: row.title, category: row.category ?? "", visibility: row.visibility }} categories={categories} />
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <p className="rounded-[14px] border border-dashed p-8 text-center text-sm text-muted-foreground">{t("empty")}</p>
      )}
    </>
  );
}

export default function AdminDocumentsPage() {
  return (
    <Streamed fallback={<AdminListSkeleton rows={4} />}>
      <Documents />
    </Streamed>
  );
}
