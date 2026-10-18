"use client";

import { Eye, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { notify } from "@/lib/notify";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type Locale = "fr" | "en" | "de";
export type TemplateFields = { subject: string; preview: string; heading: string; body: string; ctaLabel: string };

const EMPTY: TemplateFields = { subject: "", preview: "", heading: "", body: "", ctaLabel: "" };

/**
 * Texts of an automation or a campaign, one tab per language. Automations show their default
 * texts as placeholders (an empty field keeps the default); campaigns are written in full.
 * Preview renders the real email with example values; "test" sends it to the admin.
 */
export function TemplateEditor({
  ownerType,
  ownerId,
  saved,
  defaults,
  variables,
  readOnly = false,
}: {
  ownerType: "automation" | "campaign";
  ownerId: string;
  saved: Partial<Record<Locale, TemplateFields>>;
  defaults?: Partial<Record<Locale, Partial<TemplateFields>>>;
  variables: string[];
  readOnly?: boolean;
}) {
  const t = useTranslations("Mailing.editor");
  const tMailing = useTranslations("Mailing");
  const router = useRouter();
  const [locale, setLocale] = useState<Locale>("fr");
  const [values, setValues] = useState<Record<Locale, TemplateFields>>({
    fr: saved.fr ?? EMPTY,
    en: saved.en ?? EMPTY,
    de: saved.de ?? EMPTY,
  });
  const [preview, setPreview] = useState<{ subject: string; html: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const current = values[locale];
  const placeholder = (field: keyof TemplateFields) => defaults?.[locale]?.[field] ?? "";
  const set = (field: keyof TemplateFields, value: string) =>
    setValues((all) => ({ ...all, [locale]: { ...all[locale], [field]: value } }));

  // Sent as typed: for automations, an empty field keeps the default text.
  const draft = () => ({ ...current, ctaLabel: current.ctaLabel || undefined });
  const call = (url: string, method: string, body: object) =>
    fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const owner = { ownerType, ownerId, locale };

  const save = () =>
    startTransition(async () => {
      const response = await call("/api/v1/mailing/templates", "PUT", { ...owner, ...draft() });
      if (!response.ok) return void notify.error(tMailing("error"));
      notify.success(tMailing("saved"));
      router.refresh();
    });
  const reset = () =>
    startTransition(async () => {
      const response = await call("/api/v1/mailing/templates", "DELETE", owner);
      if (!response.ok) return void notify.error(tMailing("error"));
      setValues((all) => ({ ...all, [locale]: EMPTY }));
      notify.success(t("resetDone"));
      router.refresh();
    });
  const showPreview = () =>
    startTransition(async () => {
      const response = await call("/api/v1/mailing/preview", "POST", { ...owner, draft: draft() });
      if (!response.ok) return void notify.error(tMailing("error"));
      setPreview(((await response.json()) as { data: { subject: string; html: string } }).data);
    });
  const sendTest = () =>
    startTransition(async () => {
      const response = await call("/api/v1/mailing/test", "POST", { ...owner, draft: draft() });
      if (!response.ok) return void notify.error(tMailing("error"));
      const { data } = (await response.json()) as { data: { sentTo: string } };
      notify.success(t("testSent", { email: data.sentTo }));
    });

  const field = (name: keyof TemplateFields, label: string, multiline = false) => (
    <div className="space-y-1.5">
      <Label htmlFor={`tpl-${name}`}>{label}</Label>
      {multiline ? (
        <textarea
          id={`tpl-${name}`}
          rows={6}
          value={current[name]}
          placeholder={placeholder(name)}
          disabled={readOnly}
          onChange={(event) => set(name, event.target.value)}
          className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        />
      ) : (
        <Input id={`tpl-${name}`} value={current[name]} placeholder={placeholder(name)} disabled={readOnly} onChange={(event) => set(name, event.target.value)} />
      )}
    </div>
  );

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-4">
        <div role="tablist" aria-label={t("locale")} className="inline-flex rounded-lg border p-0.5 text-sm">
          {(["fr", "en", "de"] as const).map((code) => (
            <button
              key={code}
              type="button"
              role="tab"
              aria-selected={locale === code}
              onClick={() => setLocale(code)}
              className={cn(
                "cursor-pointer rounded-md px-3 py-1.5 font-wide text-[10px] font-semibold tracking-[0.06em] uppercase",
                locale === code ? "bg-segment text-segment-foreground" : "text-muted-foreground",
              )}
            >
              {code}
            </button>
          ))}
        </div>
        {defaults ? <p className="text-xs text-muted-foreground">{t("defaultHint")}</p> : null}
        {field("subject", t("subject"))}
        {field("preview", t("preview"))}
        {field("heading", t("heading"))}
        {field("body", t("body"), true)}
        <p className="-mt-2 text-xs text-muted-foreground">{t("bodyHint")}</p>
        {field("ctaLabel", t("cta"))}
        <div className="space-y-1.5">
          <p className="text-xs font-medium">{t("variables")}</p>
          <div className="flex flex-wrap gap-1.5">
            {["firstName", ...variables].map((name) => (
              <button
                key={name}
                type="button"
                disabled={readOnly}
                onClick={() => set("body", `${current.body}{${name}}`)}
                className="cursor-pointer rounded-md bg-foreground/5 px-2 py-1 font-mono text-xs transition-colors hover:bg-foreground/10"
              >
                {`{${name}}`}
              </button>
            ))}
          </div>
        </div>
        {readOnly ? null : (
          <div className="flex flex-wrap gap-2">
            <Button onClick={save} disabled={pending}>
              {t("save")}
            </Button>
            <Button variant="outline" onClick={showPreview} disabled={pending}>
              <Eye aria-hidden />
              {t("preview_action")}
            </Button>
            <Button variant="outline" onClick={sendTest} disabled={pending}>
              <Send aria-hidden />
              {t("test")}
            </Button>
            {defaults && saved[locale] ? (
              <Button variant="ghost" onClick={reset} disabled={pending}>
                {t("reset")}
              </Button>
            ) : null}
          </div>
        )}
      </div>
      <div className="space-y-2 lg:sticky lg:top-6">
        <p className="text-xs text-muted-foreground">{t("previewTitle")}</p>
        {preview ? (
          <div className="overflow-hidden rounded-[12px] border">
            <p className="border-b bg-card px-3 py-2 text-sm font-semibold">{preview.subject}</p>
            <iframe title={preview.subject} srcDoc={preview.html} sandbox="" className="h-[560px] w-full bg-white" />
          </div>
        ) : (
          <div className="grid h-40 place-items-center rounded-[12px] border border-dashed text-sm text-muted-foreground">
            <Button variant="outline" onClick={showPreview} disabled={pending}>
              <Eye aria-hidden />
              {t("preview_action")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
