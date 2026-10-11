"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn } from "@/lib/auth-client";

const schema = z.object({ email: z.email() });
type Values = z.infer<typeof schema>;

export function SignInForm() {
  const t = useTranslations("MemberArea.signIn");
  const locale = useLocale();
  const [result, setResult] = useState<"sent" | "error" | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "" } });

  async function onSubmit({ email }: Values) {
    setResult(null);
    const { error } = await signIn.magicLink({ email, callbackURL: `/${locale}/espace-membre` });
    setResult(error ? "error" : "sent");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="max-w-sm space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">{t("email")}</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder={t("emailPlaceholder")}
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? "email-error" : undefined}
          {...register("email")}
        />
        {errors.email ? (
          <p id="email-error" className="text-sm text-destructive">
            {t("invalidEmail")}
          </p>
        ) : null}
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? t("sending") : t("submit")}
      </Button>
      <p role="status" className="text-sm">
        {result === "sent" ? t("sent") : null}
        {result === "error" ? <span className="text-destructive">{t("error")}</span> : null}
      </p>
    </form>
  );
}
