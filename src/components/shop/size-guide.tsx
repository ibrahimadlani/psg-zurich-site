"use client";

import { Ruler } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { ResponsivePanel } from "@/components/admin/ui/responsive-panel";

/** "Size guide": the product's measurement table, in a panel. */
export function SizeGuide({ guide, name }: { guide: { columns: string[]; rows: string[][] }; name: string }) {
  const t = useTranslations("Shop");
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex cursor-pointer items-center gap-1.5 text-[13px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
        <Ruler className="size-3.5" aria-hidden />
        {t("sizeGuide")}
      </button>
      <ResponsivePanel open={open} onOpenChange={setOpen} title={t("sizeGuide")} description={name}>
        <div className="overflow-x-auto rounded-[12px] border">
          <table className="w-full text-[14px] tabular-nums">
            <thead className="bg-foreground/[0.03]">
              <tr>
                {guide.columns.map((column) => (
                  <th key={column} scope="col" className="px-3 py-2.5 text-left font-wide text-[10px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {guide.rows.map((row, index) => (
                <tr key={index}>
                  {guide.columns.map((column, cell) => (
                    <td key={column} className={cell === 0 ? "px-3 py-2.5 font-semibold" : "px-3 py-2.5"}>
                      {row[cell] ?? ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-[13px] text-pretty text-muted-foreground">{t("sizeGuideHint")}</p>
      </ResponsivePanel>
    </>
  );
}
