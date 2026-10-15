"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Megaphone, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { ResponsivePanel } from "@/components/admin/ui/responsive-panel";
import { adminButton, adminInput, adminLabel } from "@/components/admin/ui/styles";
import { BANNER_TONES } from "@/components/announcements/banner-tones";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

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

const labelClass = "text-[13px] font-medium";

/** The banner as visitors will see it, updated while typing. */
function Preview({ values }: { values: Pick<Values, "tone" | "titleFr" | "messageFr" | "linkUrl"> }) {
  const t = useTranslations("AdminBanner");
  const tBanner = useTranslations("Banner");
  return (
    <div className="space-y-1.5">
      <p className={adminLabel}>{t("preview")}</p>
      <div className={cn("flex items-center gap-2 rounded-[10px] px-3 py-2", BANNER_TONES[values.tone])}>
        <p className="min-w-0 flex-1 text-center text-[13px] leading-5 text-pretty">
          <strong className="font-semibold">{values.titleFr || t("titlePlaceholder")}</strong>
          <span className="opacity-85"> · {values.messageFr || t("messagePlaceholder")}</span>
          {values.linkUrl ? <span className="ml-2 font-semibold underline underline-offset-2">{tBanner("learnMore")}</span> : null}
        </p>
        <X className="size-3.5 shrink-0 opacity-75" aria-hidden />
      </div>
    </div>
  );
}

/** A new banner: kind, French text (other languages optional), link, end; live preview on top. */
function AnnouncementForm({ onDone }: { onDone: () => void }) {
  const t = useTranslations("AdminBanner");
  const router = useRouter();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: empty });
  const [tone, titleFr, messageFr, linkUrl] = useWatch({ control, name: ["tone", "titleFr", "messageFr", "linkUrl"] });

  async function onSubmit(values: Values) {
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
      toast.error(t("error"));
      return;
    }
    toast.success(t("published"));
    onDone();
    router.refresh();
  }

  const field = (name: keyof Values, label: string, props: React.ComponentProps<"input"> = {}) => (
    <div className="space-y-1.5">
      <label htmlFor={`banner-${name}`} className={labelClass}>
        {label}
      </label>
      <input id={`banner-${name}`} aria-invalid={errors[name] ? true : undefined} className={adminInput} {...props} {...register(name)} />
    </div>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit, () => toast.error(t("invalid")))} noValidate className="space-y-5">
      <Preview values={{ tone, titleFr, messageFr, linkUrl }} />
      <div className="space-y-1.5">
        <span className={labelClass}>{t("tone")}</span>
        <div className="flex flex-wrap gap-1.5">
          {TONES.map((value) => (
            <label key={value} className="cursor-pointer">
              <input type="radio" value={value} className="peer sr-only" {...register("tone")} />
              <span className="inline-flex h-9 items-center rounded-full border bg-card px-3.5 text-[13px] text-muted-foreground transition-colors peer-checked:border-foreground peer-checked:bg-foreground peer-checked:text-background peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50 lg:h-8">
                {t(`tones.${value}`)}
              </span>
            </label>
          ))}
        </div>
      </div>
      {field("titleFr", t("titleFr"), { maxLength: 80, placeholder: t("titlePlaceholder") })}
      {field("messageFr", t("messageFr"), { maxLength: 240, placeholder: t("messagePlaceholder") })}
      <details className="group rounded-[12px] border p-3.5">
        <summary className="cursor-pointer text-[13px] font-medium">{t("translations")}</summary>
        <div className="mt-3 grid gap-4">
          {field("titleDe", t("titleDe"), { maxLength: 80 })}
          {field("messageDe", t("messageDe"), { maxLength: 240 })}
          {field("titleEn", t("titleEn"), { maxLength: 80 })}
          {field("messageEn", t("messageEn"), { maxLength: 240 })}
        </div>
      </details>
      {field("linkUrl", t("linkUrl"), { type: "url", placeholder: "https://" })}
      {field("endsAt", t("endsAt"), { type: "datetime-local" })}
      <label className="flex items-center gap-2.5 text-sm">
        <input type="checkbox" className="size-[18px] accent-psg-blue" {...register("active")} />
        {t("activeNow")}
      </label>
      <div className="sticky -bottom-5 -mx-5 -mb-5 border-t bg-background px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <button type="submit" disabled={isSubmitting} className={adminButton("primary", "md", "w-full")}>
          {isSubmitting ? t("saving") : t("publish")}
        </button>
      </div>
    </form>
  );
}

/** "New announcement", in the page header: the form opens in its panel. */
export function NewAnnouncementButton() {
  const t = useTranslations("AdminBanner");
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={adminButton("primary")}>
        <Megaphone aria-hidden />
        {t("new")}
      </button>
      <ResponsivePanel open={open} onOpenChange={setOpen} title={t("new")} description={t("description")}>
        {open ? <AnnouncementForm onDone={() => setOpen(false)} /> : null}
      </ResponsivePanel>
    </>
  );
}
