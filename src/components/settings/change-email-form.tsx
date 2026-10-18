"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { notify } from "@/lib/notify";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

/** New address: confirmed from the current mailbox first, then verified on the new one. */
export function ChangeEmailForm({ current }: { current: string }) {
  const t = useTranslations("Settings.account");
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const newEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      notify.error(t("emailInvalid"));
      return;
    }
    if (newEmail === current) {
      notify.error(t("emailSame"));
      return;
    }
    startTransition(async () => {
      // The links in both emails come back to this page, in this language.
      const { error } = await authClient.changeEmail({ newEmail, callbackURL: `/${locale}/settings/account` });
      if (error) {
        notify.error(t("emailError"));
        return;
      }
      setEmail("");
      // Longer message: left on screen a little longer.
      notify.success(t("emailSent", { current }), { duration: 8000 });
    });
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-sm text-muted-foreground">{t("emailCurrent", { email: current })}</p>
      <div className="space-y-1.5">
        <Label htmlFor="new-email">{t("newEmail")}</Label>
        <div className="flex gap-2">
          <Input id="new-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          <Button type="submit" disabled={pending || !email.trim()}>
            {t("changeEmail")}
          </Button>
        </div>
      </div>
    </form>
  );
}
