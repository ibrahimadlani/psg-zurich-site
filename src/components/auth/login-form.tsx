"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { FieldError, FormMessage, inputClass, labelClass, submitClass } from "@/components/auth/auth-ui";
import { PasswordInput } from "@/components/auth/password-input";
import { Link, useRouter } from "@/i18n/navigation";
import { signIn } from "@/lib/auth-client";

const schema = z.object({
  email: z.email(),
  password: z.string().min(1),
});
type Values = z.infer<typeof schema>;

export function LoginForm() {
  const t = useTranslations("Login");
  const router = useRouter();
  const [failure, setFailure] = useState<"invalidCredentials" | "error" | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });

  async function onSubmit(values: Values) {
    setFailure(null);
    const { error } = await signIn.email(values);
    if (error) {
      setFailure(error.code === "INVALID_EMAIL_OR_PASSWORD" ? "invalidCredentials" : "error");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-[14px]">
      {failure ? <FormMessage tone="error">{t(failure)}</FormMessage> : null}
      <label className="flex flex-col gap-2">
        <span className={labelClass}>{t("email")}</span>
        <input
          type="email"
          autoComplete="email"
          placeholder={t("emailPlaceholder")}
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? "email-error" : undefined}
          className={inputClass}
          {...register("email")}
        />
        <FieldError id="email-error">{errors.email ? t("invalidEmail") : null}</FieldError>
      </label>
      <div className="flex flex-col gap-2">
        <span className="flex items-baseline justify-between">
          <label htmlFor="password" className={labelClass}>
            {t("password")}
          </label>
          <Link href="/connexion/mot-de-passe-oublie" className="text-[13px] text-muted-foreground hover:text-foreground">
            {t("forgot")}
          </Link>
        </span>
        <PasswordInput
          id="password"
          autoComplete="current-password"
          aria-invalid={errors.password ? true : undefined}
          aria-describedby={errors.password ? "password-error" : undefined}
          {...register("password")}
        />
        <FieldError id="password-error">{errors.password ? t("passwordRequired") : null}</FieldError>
      </div>
      <button type="submit" disabled={isSubmitting} className={submitClass}>
        {isSubmitting ? t("submitting") : t("submit")}
      </button>
    </form>
  );
}
