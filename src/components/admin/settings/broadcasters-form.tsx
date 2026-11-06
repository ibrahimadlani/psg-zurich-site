"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { adminButton, adminCard, adminInput } from "@/components/admin/ui/styles";
import { useRouter } from "@/i18n/navigation";
import { notify } from "@/lib/notify";

/** One field per competition of the calendar: the channel the committee checked. */
export function BroadcastersForm({ competitions, initial }: { competitions: string[]; initial: Record<string, string> }) {
  const t = useTranslations("AdminBroadcasters");
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [pending, startTransition] = useTransition();
  if (!competitions.length) return <p className="text-sm text-muted-foreground">{t("empty")}</p>;
  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const response = await fetch("/api/v1/admin/broadcasters", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(values) });
          if (response.ok) notify.success(t("saved"));
          else notify.error(t("error"));
          router.refresh();
        });
      }}
    >
      <div className={`${adminCard} divide-y`}>
        {competitions.map((competition) => (
          <label key={competition} className="flex flex-col gap-1.5 p-3.5 sm:flex-row sm:items-center sm:gap-4">
            <span className="min-w-0 flex-1 text-[15px] font-semibold">{competition}</span>
            <input
              className={`${adminInput} sm:w-72`}
              maxLength={60}
              placeholder={t("placeholder")}
              value={values[competition] ?? ""}
              onChange={(event) => setValues((current) => ({ ...current, [competition]: event.target.value }))}
            />
          </label>
        ))}
      </div>
      <button type="submit" disabled={pending} className={adminButton("primary")}>
        {t("save")}
      </button>
    </form>
  );
}
