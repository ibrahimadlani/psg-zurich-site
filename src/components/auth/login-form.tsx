"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { notify } from "@/lib/notify";
import { z } from "zod";
import {
  FieldError,
  inputClass,
  labelClass,
  submitClass,
} from "@/components/auth/auth-ui";
import { PasswordInput } from "@/components/auth/password-input";
import { Link, useRouter } from "@/i18n/navigation";
import { useReturnPath } from "@/hooks/use-return-path";
import { signIn } from "@/lib/auth-client";
import { RETURN_PARAM, withReturn } from "@/lib/return-to";

const schema = z.object({
  email: z.email(),
  password: z.string().min(1),
});
type Values = z.infer<typeof schema>;

export function LoginForm() {
  const t = useTranslations("Login");
  const locale = useLocale();
  const router = useRouter();
  // The page the sign-in is for (`?suite=`), checked; else the member area.
  const next = useReturnPath();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  // An expired or invalid confirmation link lands here with ?error=… (set by Better Auth).
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("error")) {
      notify.error(t("linkInvalid"));
    }
  }, [t]);

  async function onSubmit(values: Values) {
    // callbackURL: where a re-sent confirmation link lands (and the email's language).
    const { data, error } = await signIn.email({
      ...values,
      callbackURL: withReturn(`/${locale}/welcome`, next),
    });
    if (error) {
      notify.error(
        t(
          error.code === "INVALID_EMAIL_OR_PASSWORD"
            ? "invalidCredentials"
            : error.code === "EMAIL_NOT_VERIFIED"
              ? "notVerified"
              : "error",
        ),
      );
      return;
    }
    // Shown on the page the sign-in leads to, once it is loaded (not here, where it would run out).
    notify.afterNavigation("success", t("welcome", { name: data?.user.name.split(" ")[0] ?? "" }));
    // Through the welcome step, which steps aside at once when it was already done.
    router.push(`/welcome?${RETURN_PARAM}=${encodeURIComponent(next ?? "/member")}`);
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-[14px]"
    >
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
        <FieldError id="email-error">
          {errors.email ? t("invalidEmail") : null}
        </FieldError>
      </label>
      <div className="flex flex-col gap-2">
        <span className="flex items-baseline justify-between">
          <label htmlFor="password" className={labelClass}>
            {t("password")}
          </label>
          <Link
            href={withReturn("/login/forgot-password", next)}
            prefetch={false}
            className="text-[13px] text-muted-foreground hover:text-foreground"
          >
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
        <FieldError id="password-error">
          {errors.password ? t("passwordRequired") : null}
        </FieldError>
      </div>
      <button type="submit" disabled={isSubmitting} className={submitClass}>
        {isSubmitting ? t("submitting") : t("submit")}
      </button>
    </form>
  );
}
