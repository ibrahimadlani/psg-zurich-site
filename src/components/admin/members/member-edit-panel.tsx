"use client";

import { useTranslations } from "next-intl";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { ResponsivePanel } from "@/components/admin/ui/responsive-panel";
import { adminButton, adminInput } from "@/components/admin/ui/styles";
import { PhoneInput } from "@/components/ui/phone-input";
import { LOCALES, type Locale } from "@/db/schema";
import { useRouter } from "@/i18n/navigation";

export type MemberEditValues = {
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  postcode: string;
  city: string;
  birthDate: string;
  locale: Locale;
};

const labelClass = "text-[13px] font-medium";

/** The committee corrects a member's details (names, contact, birth date, email language). */
export function MemberEditPanel({
  id,
  open,
  onOpenChange,
  defaults,
}: {
  id: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaults: MemberEditValues;
}) {
  const t = useTranslations("AdminMembers");
  const tMembership = useTranslations("Membership");
  const tLocale = useTranslations("LocaleSwitcher");
  const router = useRouter();
  const formId = useId();
  const [values, setValues] = useState(defaults);
  const [invalid, setInvalid] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const set = <K extends keyof MemberEditValues>(key: K, value: MemberEditValues[K]) => setValues((current) => ({ ...current, [key]: value }));

  const field = (key: "firstName" | "lastName" | "address" | "postcode" | "city", label: string, props: React.ComponentProps<"input"> = {}) => (
    <div className="space-y-1.5">
      <label htmlFor={`${formId}-${key}`} className={labelClass}>
        {label}
      </label>
      <input
        id={`${formId}-${key}`}
        value={values[key]}
        aria-invalid={invalid.includes(key) || undefined}
        onChange={(event) => set(key, event.target.value)}
        className={adminInput}
        {...props}
      />
    </div>
  );

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    startTransition(async () => {
      const response = await fetch(`/api/v1/members/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ profile: values }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: { details?: { fieldErrors?: Record<string, unknown>; formErrors?: unknown } } } | null;
        // Errors come back nested under "profile": the field names are in the messages' paths.
        const raw = JSON.stringify(body?.error?.details ?? {});
        setInvalid((["firstName", "lastName", "phone", "address", "postcode", "city", "birthDate"] as const).filter((key) => raw.includes(key)));
        toast.error(t("editError"));
        return;
      }
      setInvalid([]);
      toast.success(t("saved"));
      onOpenChange(false);
      router.refresh();
    });
  };

  return (
    <ResponsivePanel
      open={open}
      onOpenChange={(next) => {
        if (next) setValues(defaults);
        onOpenChange(next);
      }}
      title={t("editTitle")}
      description={t("editHint")}
      footer={
        <>
          <button type="button" onClick={() => onOpenChange(false)} className={adminButton("secondary")}>
            {t("cancel")}
          </button>
          <button type="submit" form={formId} disabled={pending} className={adminButton("primary")}>
            {t("save")}
          </button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {field("firstName", tMembership("firstName"), { autoComplete: "off", maxLength: 100, required: true })}
          {field("lastName", tMembership("lastName"), { autoComplete: "off", maxLength: 100, required: true })}
        </div>
        <div className="space-y-1.5">
          <label htmlFor={`${formId}-phone`} className={labelClass}>
            {tMembership("phone")}
          </label>
          <PhoneInput
            id={`${formId}-phone`}
            value={values.phone}
            onChange={(value) => set("phone", value)}
            invalid={invalid.includes("phone")}
            countryLabel={tMembership("phoneCountry")}
            className="h-11 rounded-[8px] border border-input lg:h-9 dark:bg-input/30"
          />
        </div>
        {field("address", tMembership("address"), { autoComplete: "off", maxLength: 255 })}
        <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-4">
          {field("postcode", tMembership("postcode"), { autoComplete: "off", maxLength: 10, inputMode: "numeric" })}
          {field("city", tMembership("city"), { autoComplete: "off", maxLength: 100 })}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor={`${formId}-birth`} className={labelClass}>
              {t("birthDate")}
            </label>
            <input
              id={`${formId}-birth`}
              type="date"
              value={values.birthDate}
              aria-invalid={invalid.includes("birthDate") || undefined}
              onChange={(event) => set("birthDate", event.target.value)}
              className={adminInput}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor={`${formId}-locale`} className={labelClass}>
              {t("emailLanguage")}
            </label>
            <select id={`${formId}-locale`} value={values.locale} onChange={(event) => set("locale", event.target.value as Locale)} className={adminInput}>
              {LOCALES.map((locale) => (
                <option key={locale} value={locale}>
                  {tLocale(locale)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </form>
    </ResponsivePanel>
  );
}
