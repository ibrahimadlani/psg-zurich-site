"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { FieldError, FormMessage, inputClass, labelClass, submitClass } from "@/components/auth/auth-ui";
import { requestPasswordReset } from "@/lib/auth-client";

const schema = z.object({ email: z.email() });
type Values = z.infer<typeof schema>;

export function ForgotPasswordForm() {
  const t = useTranslations("ForgotPassword");
  const tLogin = useTranslations("Login");
  const locale = useLocale();
  const [result, setResult] = useState<"sent" | "error" | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "" } });

  async function onSubmit({ email }: Values) {
    setResult(null);
    const { error } = await requestPasswordReset({
      email,
      redirectTo: `/${locale}/connexion/nouveau-mot-de-passe`,
    });
    // Same answer whether or not the account exists.
    setResult(error ? "error" : "sent");
  }

  if (result === "sent") return <FormMessage tone="success">{t("sent")}</FormMessage>;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-[14px]">
      {result === "error" ? <FormMessage tone="error">{tLogin("error")}</FormMessage> : null}
      <label className="flex flex-col gap-2">
        <span className={labelClass}>{tLogin("email")}</span>
        <input
          type="email"
          autoComplete="email"
          placeholder={tLogin("emailPlaceholder")}
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? "email-error" : undefined}
          className={inputClass}
          {...register("email")}
        />
        <FieldError id="email-error">{errors.email ? tLogin("invalidEmail") : null}</FieldError>
      </label>
      <button type="submit" disabled={isSubmitting} className={submitClass}>
        {isSubmitting ? t("submitting") : t("submit")}
      </button>
    </form>
  );
}
