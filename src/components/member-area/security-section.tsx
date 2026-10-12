"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { FormMessage } from "@/components/auth/auth-ui";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { changePassword } from "@/lib/auth-client";

type Message = { tone: "success" | "error"; key: "changed" | "wrongPassword" | "tooShort" | "error" | "revoked" };

/** Change password (other devices are signed out). */
export function SecuritySection({ bare = false }: { bare?: boolean }) {
  const t = useTranslations("MemberArea.security");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<Message | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (newPassword.length < 8) {
      setMessage({ tone: "error", key: "tooShort" });
      return;
    }
    startTransition(async () => {
      const { error } = await changePassword({ currentPassword, newPassword, revokeOtherSessions: true });
      if (error) {
        setMessage({ tone: "error", key: error.code === "INVALID_PASSWORD" ? "wrongPassword" : "error" });
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setMessage({ tone: "success", key: "changed" });
    });
  };


  const content = (
      <div className="space-y-6">
        {message ? <FormMessage tone={message.tone}>{t(message.key)}</FormMessage> : null}
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="current-password">{t("currentPassword")}</Label>
              <PasswordInput
                id="current-password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-password">{t("newPassword")}</Label>
              <PasswordInput
                id="new-password"
                autoComplete="new-password"
                aria-describedby="new-password-hint"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
              <p id="new-password-hint" className="text-xs text-muted-foreground">
                {t("newPasswordHint")}
              </p>
            </div>
          </div>
          <Button type="submit" disabled={pending || !currentPassword || !newPassword}>
            {pending ? t("changing") : t("change")}
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
