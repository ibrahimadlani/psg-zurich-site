"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { adminButton, adminInput, adminLabel } from "@/components/admin/ui/styles";
import { useRouter } from "@/i18n/navigation";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";

export type MatchPublicValues = { broadcaster: string; intro: { fr: string; en: string; de: string } };

const LOCALES = ["fr", "en", "de"] as const;

/** What the committee adds to the public page of a match: the channel, a few words for big ones. */
export function MatchPublicForm({ matchId, defaults, onDone }: { matchId: string; defaults: MatchPublicValues; onDone: () => void }) {
  const t = useTranslations("AdminMatches.public");
  const tMatches = useTranslations("AdminMatches");
  const router = useRouter();
  const [values, setValues] = useState(defaults);
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const response = await fetch(`/api/v1/matches/${matchId}/public`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(values) });
          if (!response.ok) {
            notify.error(t("error"));
            return;
          }
          notify.success(t("saved"));
          router.refresh();
          onDone();
        });
      }}
    >
      <div className="space-y-1.5">
        <label htmlFor="match-broadcaster" className={adminLabel}>
          {t("broadcaster")}
        </label>
        <input id="match-broadcaster" className={adminInput} maxLength={60} value={values.broadcaster} onChange={(event) => setValues({ ...values, broadcaster: event.target.value })} />
        <p className="text-xs text-pretty text-muted-foreground">{t("broadcasterHint")}</p>
      </div>
      {LOCALES.map((locale) => (
        <div key={locale} className="space-y-1.5">
          <label htmlFor={`match-intro-${locale}`} className={adminLabel}>
            {t("intro", { locale: locale.toUpperCase() })}
          </label>
          <textarea
            id={`match-intro-${locale}`}
            rows={4}
            maxLength={800}
            className={cn(adminInput, "h-auto py-2.5 lg:h-auto")}
            value={values.intro[locale]}
            onChange={(event) => setValues({ ...values, intro: { ...values.intro, [locale]: event.target.value } })}
          />
        </div>
      ))}
      <p className="text-xs text-pretty text-muted-foreground">{t("introHint")}</p>
      <button type="submit" disabled={pending} className={adminButton("primary")}>
        {tMatches("save")}
      </button>
    </form>
  );
}
