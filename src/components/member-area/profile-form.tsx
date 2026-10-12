"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { FormMessage } from "@/components/auth/auth-ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "@/i18n/navigation";
import { useSession } from "@/lib/auth-client";

const schema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  phone: z.string().trim().max(32),
  city: z.string().trim().max(100),
});
type Values = z.infer<typeof schema>;

/** The member edits their own details; the email stays read-only. */
export function ProfileForm({ email, defaults, bare = false }: { email: string; defaults: Values; bare?: boolean }) {
  const t = useTranslations("MemberArea.profile");
  const tMembership = useTranslations("Membership");
  const router = useRouter();
  const { refetch } = useSession();
  const [result, setResult] = useState<"saved" | "error" | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: defaults });

  async function onSubmit(values: Values) {
    setResult(null);
    const response = await fetch("/api/v1/me", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!response.ok) {
      setResult("error");
      return;
    }
    setResult("saved");
    reset(values);
    // The header shows the name from the session.
    refetch();
    router.refresh();
  }

  const field = (name: keyof Values, props: React.ComponentProps<"input"> = {}) => (
    <div className="space-y-1.5">
      <Label htmlFor={`profile-${name}`}>
        {tMembership(name)}
        {name === "phone" || name === "city" ? (
          <span className="font-normal text-muted-foreground"> · {tMembership("optional")}</span>
        ) : null}
      </Label>
      <Input id={`profile-${name}`} aria-invalid={errors[name] ? true : undefined} {...props} {...register(name)} />
      {errors[name] ? <p className="text-xs text-destructive">{tMembership("required")}</p> : null}
    </div>
  );

  const content = (
      <div className="space-y-4">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {result ? <FormMessage tone={result === "saved" ? "success" : "error"}>{t(result)}</FormMessage> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            {field("firstName", { autoComplete: "given-name", maxLength: 100 })}
            {field("lastName", { autoComplete: "family-name", maxLength: 100 })}
            {field("phone", { type: "tel", autoComplete: "tel", maxLength: 32 })}
            {field("city", { autoComplete: "address-level2", maxLength: 100 })}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-email">{t("email")}</Label>
            <Input id="profile-email" value={email} readOnly disabled />
            <p className="text-xs text-muted-foreground">{t("emailHint")}</p>
          </div>
          <Button type="submit" disabled={isSubmitting || !isDirty}>
            {isSubmitting ? t("saving") : t("save")}
          </Button>
        </form>
      </div>
  );
  if (bare) return content;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}
