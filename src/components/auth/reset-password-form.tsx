"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { FieldError, FormMessage, inlineLinkClass, labelClass, submitClass } from "@/components/auth/auth-ui";
import { PasswordInput } from "@/components/auth/password-input";
import { Link } from "@/i18n/navigation";
import { resetPassword } from "@/lib/auth-client";

const schema = z
  .object({ password: z.string().min(8), confirm: z.string() })
  .refine((values) => values.password === values.confirm, { path: ["confirm"] });
type Values = z.infer<typeof schema>;

export function ResetPasswordForm() {
  const t = useTranslations("ResetPassword");
  const params = useSearchParams();
  const token = params.get("token");
  const [result, setResult] = useState<"done" | "invalidLink" | "error" | null>(
    token && !params.get("error") ? null : "invalidLink",
  );
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { password: "", confirm: "" } });

  async function onSubmit({ password }: Values) {
    const { error } = await resetPassword({ newPassword: password, token: token ?? "" });
    if (!error) setResult("done");
    else setResult(error.code === "INVALID_TOKEN" ? "invalidLink" : "error");
  }

  if (result === "done" || result === "invalidLink") {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <FormMessage tone={result === "done" ? "success" : "error"}>{t(result)}</FormMessage>
        <Link
          href={result === "done" ? "/connexion" : "/connexion/mot-de-passe-oublie"}
          className={`text-[14px] ${inlineLinkClass}`}
        >
          {result === "done" ? t("goToLogin") : t("requestNew")}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-[14px]">
      {result === "error" ? <FormMessage tone="error">{t("error")}</FormMessage> : null}
      <div className="flex flex-col gap-2">
        <label htmlFor="password" className={labelClass}>
          {t("password")}
        </label>
        <PasswordInput
          id="password"
          autoComplete="new-password"
          aria-invalid={errors.password ? true : undefined}
          aria-describedby={errors.password ? "password-error" : undefined}
          {...register("password")}
        />
        <FieldError id="password-error">{errors.password ? t("tooShort") : null}</FieldError>
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="confirm" className={labelClass}>
          {t("confirm")}
        </label>
        <PasswordInput
          id="confirm"
          autoComplete="new-password"
          aria-invalid={errors.confirm ? true : undefined}
          aria-describedby={errors.confirm ? "confirm-error" : undefined}
          {...register("confirm")}
        />
        <FieldError id="confirm-error">{errors.confirm ? t("mismatch") : null}</FieldError>
      </div>
      <button type="submit" disabled={isSubmitting} className={submitClass}>
        {isSubmitting ? t("submitting") : t("submit")}
      </button>
    </form>
  );
}
