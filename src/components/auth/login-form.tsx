"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { useState, useSyncExternalStore } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  FieldError,
  FormMessage,
  inputClass,
  labelClass,
  submitClass,
} from "@/components/auth/auth-ui";
import { PasswordInput } from "@/components/auth/password-input";
import { Link, useRouter } from "@/i18n/navigation";
import { signIn } from "@/lib/auth-client";

const schema = z.object({
  email: z.email(),
  password: z.string().min(1),
});
type Values = z.infer<typeof schema>;

type Failure = "invalidCredentials" | "notVerified" | "linkInvalid" | "error";

// An expired or invalid confirmation link lands here with ?error=… (set by Better Auth).
const noop = () => () => {};
const linkErrorFromUrl = () =>
  new URLSearchParams(window.location.search).has("error");

/** Page to go back to after signing in (`?suite=/matchs/…`), only paths of this site. */
function returnPath() {
  const next = new URLSearchParams(window.location.search).get("suite") ?? "";
  return /^\/(?![/\\])/.test(next) ? next : "/";
}

export function LoginForm() {
  const t = useTranslations("Login");
  const locale = useLocale();
  const router = useRouter();
  const linkError = useSyncExternalStore(noop, linkErrorFromUrl, () => false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const shown = failure ?? (linkError ? "linkInvalid" : null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: Values) {
    setFailure(null);
    // callbackURL: where a re-sent confirmation link lands (and the email's language).
    const { error } = await signIn.email({
      ...values,
      callbackURL: `/${locale}/connexion`,
    });
    if (error) {
      setFailure(
        error.code === "INVALID_EMAIL_OR_PASSWORD"
          ? "invalidCredentials"
          : error.code === "EMAIL_NOT_VERIFIED"
            ? "notVerified"
            : "error",
      );
      return;
    }
    router.push(returnPath());
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-[14px]"
    >
      {shown ? <FormMessage tone="error">{t(shown)}</FormMessage> : null}
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
            href="/connexion/mot-de-passe-oublie"
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
