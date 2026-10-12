"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { FieldError, FormMessage, inlineLinkClass, inputClass, labelClass, submitClass } from "@/components/auth/auth-ui";
import { PasswordInput } from "@/components/auth/password-input";
import { Link } from "@/i18n/navigation";
import { useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

export type MemberStatus = "pending" | "active" | "expired" | "suspended";

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

function Steps({ step }: { step: 1 | 2 }) {
  const t = useTranslations("Membership");
  const item = (n: 1 | 2, label: string) => (
    <span
      aria-current={step === n ? "step" : undefined}
      className={cn(
        "flex items-center gap-2 font-wide text-[10px] font-semibold tracking-[0.06em] uppercase transition-colors duration-300",
        step === n ? "text-foreground" : "text-muted-foreground",
      )}
    >
      <span className="inline-flex size-5 items-center justify-center rounded-full border border-current text-[10px]">
        {n}
      </span>
      {label}
    </span>
  );
  return (
    <div className="flex items-center justify-center gap-2.5">
      {item(1, t("step1"))}
      <span aria-hidden className="h-px w-7 bg-border" />
      {item(2, t("step2"))}
    </div>
  );
}

const heading = "font-narrow text-[length:clamp(32px,6vw,44px)] leading-[0.95] font-extrabold uppercase italic";

/** Step 2: account exists, membership fee still to pay. */
function StatusStep({ status, season, justCreated }: { status: MemberStatus; season: string; justCreated: boolean }) {
  const t = useTranslations("Membership");
  return (
    <div className="flex flex-col gap-5 text-center">
      <div className="flex flex-col gap-2">
        <h1 className={heading}>{justCreated ? t("doneTitle") : t("title")}</h1>
        {status === "pending" ? (
          <p className="text-[15px] leading-normal text-pretty text-muted-foreground">{t("doneBody")}</p>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-3 rounded-[10px] border bg-card px-4 py-3.5 text-left shadow-brand">
        <span className="flex flex-col gap-1">
          <span className={labelClass}>{t("statusLabel")}</span>
          <span className="text-[14px] font-semibold">{t("season", { season })}</span>
        </span>
        <span
          className={cn(
            "text-[12px] font-semibold",
            status === "active" ? "text-psg-blue dark:text-foreground" : "text-muted-foreground",
          )}
        >
          {t(`status.${status}`)}
        </span>
      </div>
      {status === "pending" ? (
        <>
          <button type="button" disabled title={t("paySoon")} className={submitClass}>
            {t("pay")}
          </button>
          <p className="-mt-2 text-[12px] text-muted-foreground">{t("paySoon")}</p>
          <Link href="/" className={`self-center text-[14px] ${inlineLinkClass} text-muted-foreground`}>
            {t("later")}
          </Link>
        </>
      ) : null}
    </div>
  );
}

export function MembershipFlow({
  initialStatus,
  season,
}: {
  /** Set when a signed-in member opens the page: go straight to step 2. */
  initialStatus: MemberStatus | null;
  season: string;
}) {
  const t = useTranslations("Membership");
  const { refetch } = useSession();
  const [status, setStatus] = useState<MemberStatus | null>(initialStatus);
  const [justCreated, setJustCreated] = useState(false);
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
      body: JSON.stringify(values),
    });
    if (!response.ok) {
      setFailure(response.status === 409 ? "emailTaken" : "error");
      return;
    }
    // The new member is now signed in: let the header pick up the session.
    await refetch();
    setJustCreated(true);
    setStatus("pending");
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

  return (
    <div className="flex w-full max-w-[420px] flex-col gap-[22px]">
      <Steps step={status ? 2 : 1} />
      {status ? (
        <StatusStep status={status} season={season} justCreated={justCreated} />
      ) : (
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
                  <Link href="/connexion" className="underline underline-offset-2">
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
                {t("terms")}
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
            <Link href="/connexion" className={inlineLinkClass}>
              {t("signIn")}
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
