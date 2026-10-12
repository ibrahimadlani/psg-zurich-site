"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  AuthPanel,
  FieldError,
  FormMessage,
  inlineLinkClass,
  inputClass,
  labelClass,
  submitClass,
} from "@/components/auth/auth-ui";
import { Link } from "@/i18n/navigation";
import { requestPasswordReset } from "@/lib/auth-client";

const schema = z.object({ email: z.email() });
type Values = z.infer<typeof schema>;

/** Forgot-password panel: the form gives way to a quiet "email sent" state (fade-up). */
export function ForgotPasswordPanel() {
  const t = useTranslations("ForgotPassword");
  const tLogin = useTranslations("Login");
  const locale = useLocale();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "" } });

  async function onSubmit({ email }: Values) {
    setFailed(false);
    const { error } = await requestPasswordReset({
      email,
      redirectTo: `/${locale}/connexion/nouveau-mot-de-passe`,
    });
    if (error) {
      setFailed(true);
      return;
    }
    // Same answer whether or not the account exists.
    setSentTo(email);
  }

  const backToLogin = (
    <p className="text-center text-[14px]">
      <Link href="/connexion" prefetch={false} className={inlineLinkClass}>
        {t("backToLogin")}
      </Link>
    </p>
  );

  return sentTo ? (
    <div key="sent" className="flex w-full max-w-[360px] animate-page-in flex-col items-center gap-5 text-center motion-reduce:animate-none">
      <span className="grid size-12 animate-in place-items-center rounded-full border border-psg-blue/25 text-psg-blue zoom-in-75 fade-in-0 duration-500 dark:border-foreground/25 dark:text-foreground">
        <Check className="size-5" strokeWidth={1.75} aria-hidden />
      </span>
      <div className="flex flex-col gap-2">
        <h1 className="font-narrow text-[length:clamp(32px,6vw,44px)] leading-[0.95] font-extrabold uppercase italic">
          {t("sentTitle")}
        </h1>
        <p role="status" className="text-[15px] leading-normal text-pretty text-muted-foreground">
          {t.rich("sentBody", {
            email: sentTo,
            strong: (chunks) => <strong className="font-semibold text-foreground">{chunks}</strong>,
          })}
        </p>
      </div>
      {backToLogin}
    </div>
  ) : (
    <div key="form" className="w-full max-w-[360px] animate-page-in motion-reduce:animate-none">
      <AuthPanel title={t("title")} body={t("body")}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-[14px]">
          {failed ? <FormMessage tone="error">{tLogin("error")}</FormMessage> : null}
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
        {backToLogin}
      </AuthPanel>
    </div>
  );
}
