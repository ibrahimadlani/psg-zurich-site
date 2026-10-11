"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "@/i18n/navigation";

const TONES = ["info", "maintenance", "urgent"] as const;

const schema = z.object({
  tone: z.enum(TONES),
  titleFr: z.string().trim().min(1).max(80),
  messageFr: z.string().trim().min(1).max(240),
  titleEn: z.string().trim().max(80),
  messageEn: z.string().trim().max(240),
  titleDe: z.string().trim().max(80),
  messageDe: z.string().trim().max(240),
  linkUrl: z.union([z.url(), z.literal("")]),
  endsAt: z.string(),
  active: z.boolean(),
});
type Values = z.infer<typeof schema>;

const empty: Values = {
  tone: "maintenance",
  titleFr: "",
  messageFr: "",
  titleEn: "",
  messageEn: "",
  titleDe: "",
  messageDe: "",
  linkUrl: "",
  endsAt: "",
  active: true,
};

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function AnnouncementForm() {
  const t = useTranslations("AdminBanner");
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: empty });

  async function onSubmit(values: Values) {
    setFailed(false);
    const response = await fetch("/api/v1/announcements", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...values,
        // datetime-local has no timezone: interpret it in the admin's browser.
        endsAt: values.endsAt ? new Date(values.endsAt).toISOString() : "",
      }),
    });
    if (!response.ok) {
      setFailed(true);
      return;
    }
    reset(empty);
    router.refresh();
  }

  const field = (name: keyof Values, label: string, props: React.ComponentProps<"input"> = {}) => (
    <div className="space-y-1.5">
      <Label htmlFor={`banner-${name}`}>{label}</Label>
      <Input id={`banner-${name}`} aria-invalid={errors[name] ? true : undefined} {...props} {...register(name)} />
    </div>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
        <div className="space-y-1.5">
          <Label htmlFor="banner-tone">{t("tone")}</Label>
          <select id="banner-tone" className={selectClass} {...register("tone")}>
            {TONES.map((tone) => (
              <option key={tone} value={tone}>
                {t(`tones.${tone}`)}
              </option>
            ))}
          </select>
        </div>
        {field("titleFr", t("titleFr"), { maxLength: 80, placeholder: t("titlePlaceholder") })}
      </div>
      {field("messageFr", t("messageFr"), { maxLength: 240, placeholder: t("messagePlaceholder") })}

      <details className="rounded-lg border p-3">
        <summary className="cursor-pointer text-sm font-medium">{t("translations")}</summary>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {field("titleEn", t("titleEn"), { maxLength: 80 })}
          {field("messageEn", t("messageEn"), { maxLength: 240 })}
          {field("titleDe", t("titleDe"), { maxLength: 80 })}
          {field("messageDe", t("messageDe"), { maxLength: 240 })}
        </div>
      </details>

      <div className="grid gap-4 sm:grid-cols-2">
        {field("linkUrl", t("linkUrl"), { type: "url", placeholder: "https://" })}
        {field("endsAt", t("endsAt"), { type: "datetime-local" })}
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="size-4 accent-primary" {...register("active")} />
        {t("activeNow")}
      </label>

      {failed || Object.keys(errors).length > 0 ? (
        <p role="alert" className="text-sm text-destructive">
          {failed ? t("error") : t("invalid")}
        </p>
      ) : null}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? t("saving") : t("publish")}
      </Button>
    </form>
  );
}
