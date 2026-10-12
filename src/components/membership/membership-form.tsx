"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { FieldError, FormMessage, inlineLinkClass, inputClass, labelClass, submitClass } from "@/components/auth/auth-ui";
import { PasswordInput } from "@/components/auth/password-input";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const schema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email: z.email(),
  phone: z.string().trim().max(32),
  city: z.string().trim().max(100),
  password: z.string().min(8).max(128),
  acceptTerms: z.boolean().refine(Boolean),
});
type Values = z.infer<typeof schema>;

const heading = "font-narrow text-[length:clamp(32px,6vw,44px)] leading-[0.95] font-extrabold uppercase italic";

/**
 * Membership sign-up form; on success it gives way to an "email sent" state (fade-up)
 * while the visitor confirms their address. The membership fee is paid later, from the member area.
 */
export function MembershipForm() {
  const t = useTranslations("Membership");
  const locale = useLocale();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [failure, setFailure] = useState<"emailTaken" | "error" | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { firstName: "", lastName: "", email: "", phone: "", city: "", password: "", acceptTerms: false },
  });

  async function onSubmit(values: Values) {
    setFailure(null);
    const response = await fetch("/api/v1/membership", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...values, locale }),
    });
    if (!response.ok) {
      setFailure(response.status === 409 ? "emailTaken" : "error");
      return;
    }
    setSentTo(values.email);
  }

  const field = (
    name: "firstName" | "lastName" | "email" | "phone" | "city",
    props: React.ComponentProps<"input">,
    optional = false,
  ) => (
    <label className="flex min-w-0 flex-col gap-[7px]">
      <span className={cn(labelClass, "flex items-baseline justify-between")}>
        {t(name)}
        {optional ? (
          <span className="font-sans text-[12px] font-normal tracking-normal normal-case">{t("optional")}</span>
        ) : null}
      </span>
      <input
        {...props}
        aria-invalid={errors[name] ? true : undefined}
        aria-describedby={errors[name] ? `${name}-error` : undefined}
        className={cn(inputClass, "px-3")}
        {...register(name)}
      />
      <FieldError id={`${name}-error`}>
        {errors[name] ? (name === "email" ? t("invalidEmail") : t("required")) : null}
      </FieldError>
    </label>
  );

  if (sentTo) {
    return (
      <div key="sent" className="flex w-full max-w-[360px] animate-page-in flex-col items-center gap-5 text-center motion-reduce:animate-none">
        <span className="grid size-12 animate-in place-items-center rounded-full border border-psg-blue/25 text-psg-blue zoom-in-75 fade-in-0 duration-500 dark:border-foreground/25 dark:text-foreground">
          <MailCheck className="size-5" strokeWidth={1.75} aria-hidden />
        </span>
        <div className="flex flex-col gap-2">
          <h1 className={heading}>{t("sentTitle")}</h1>
          <p role="status" className="text-[15px] leading-normal text-pretty text-muted-foreground">
            {t.rich("sentBody", {
              email: sentTo,
              strong: (chunks) => <strong className="font-semibold text-foreground">{chunks}</strong>,
            })}
          </p>
        </div>
        <p className="text-[13px] leading-[1.45] text-pretty text-muted-foreground">{t("sentHint")}</p>
        <p className="text-center text-[14px]">
          <Link href="/connexion" prefetch={false} className={inlineLinkClass}>
            {t("backToLogin")}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div key="form" className="flex w-full max-w-[420px] animate-page-in flex-col gap-[22px] motion-reduce:animate-none">
      <div className="flex flex-col gap-[22px]">
          <div className="flex flex-col gap-2 text-center">
            <h1 className={heading}>{t("title")}</h1>
            <p className="text-[15px] leading-normal text-pretty text-muted-foreground">{t("body")}</p>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-[14px]">
            {failure ? (
              <FormMessage tone="error">
                {t(failure)}{" "}
                {failure === "emailTaken" ? (
                  <Link href="/connexion" prefetch={false} className="underline underline-offset-2">
                    {t("signIn")}
                  </Link>
                ) : null}
              </FormMessage>
            ) : null}
            <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-[14px]">
              {field("firstName", { autoComplete: "given-name", maxLength: 100 })}
              {field("lastName", { autoComplete: "family-name", maxLength: 100 })}
            </div>
            {field("email", { type: "email", autoComplete: "email" })}
            <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-[14px]">
              {field("phone", { type: "tel", autoComplete: "tel", maxLength: 32 }, true)}
              {field("city", { autoComplete: "address-level2", maxLength: 100 }, true)}
            </div>
            <div className="flex flex-col gap-[7px]">
              <label htmlFor="password" className={labelClass}>
                {t("password")}
              </label>
              <PasswordInput
                id="password"
                autoComplete="new-password"
                aria-invalid={errors.password ? true : undefined}
                aria-describedby="password-hint"
                {...register("password")}
              />
              <span id="password-hint" className={cn("text-[12px]", errors.password ? "text-destructive" : "text-muted-foreground")}>
                {errors.password ? t("passwordTooShort") : t("passwordHint")}
              </span>
            </div>
            <label className="flex cursor-pointer items-start gap-2.5 text-[13px] leading-[1.45] text-muted-foreground">
              <input
                type="checkbox"
                aria-invalid={errors.acceptTerms ? true : undefined}
                className="mt-0.5 size-4 shrink-0 accent-segment"
                {...register("acceptTerms")}
              />
              <span>
                {t.rich("terms", {
                  // New tab: the form keeps what was typed.
                  privacy: (chunks) => (
                    <a href={`/${locale}/confidentialite`} target="_blank" className="text-foreground underline underline-offset-2">
                      {chunks}
                    </a>
                  ),
                })}
                {errors.acceptTerms ? (
                  <span className="mt-1 block text-destructive">{t("termsRequired")}</span>
                ) : null}
              </span>
            </label>
            <button type="submit" disabled={isSubmitting} className={cn(submitClass, "mt-1.5")}>
              {isSubmitting ? t("submitting") : t("submit")}
            </button>
          </form>
          <p className="text-center text-[14px] text-muted-foreground">
            {t("haveAccount")}{" "}
            <Link href="/connexion" prefetch={false} className={inlineLinkClass}>
              {t("signIn")}
            </Link>
          </p>
      </div>
    </div>
  );
}
