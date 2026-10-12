"use client";

import { Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { FormMessage } from "@/components/auth/auth-ui";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useRouter } from "@/i18n/navigation";
import { deleteUser } from "@/lib/auth-client";

/** Data export (JSON) and account deletion (password + explicit confirmation). */
export function DataSection({ canDelete }: { canDelete: boolean }) {
  const t = useTranslations("MemberArea.data");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [failure, setFailure] = useState<"wrongPassword" | "error" | null>(null);
  const [pending, startTransition] = useTransition();

  const remove = (event: React.FormEvent) => {
    event.preventDefault();
    startTransition(async () => {
      setFailure(null);
      const { error } = await deleteUser({ password });
      if (error) {
        setFailure(error.code === "INVALID_PASSWORD" ? "wrongPassword" : "error");
        return;
      }
      router.replace("/");
      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <Button variant="outline" asChild>
          {/* A plain link: the browser downloads the attachment. */}
          <a href="/api/v1/me/export" download>
            <Download aria-hidden />
            {t("export")}
          </a>
        </Button>

        <div className="border-t pt-5">
          {!canDelete ? (
            <p className="text-sm text-muted-foreground">{t("superadmin")}</p>
          ) : open ? (
            <form onSubmit={remove} className="space-y-4 rounded-lg border border-destructive/40 p-4">
              <p className="text-sm text-destructive">{t("deleteWarning")}</p>
              {failure ? <FormMessage tone="error">{t(failure)}</FormMessage> : null}
              <div className="max-w-sm space-y-1.5">
                <Label htmlFor="delete-password">{t("deletePassword")}</Label>
                <PasswordInput
                  id="delete-password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
              <label className="flex cursor-pointer items-start gap-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(event) => setConfirmed(event.target.checked)}
                  className="mt-0.5 size-4 accent-destructive"
                />
                {t("deleteConfirm")}
              </label>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" variant="destructive" disabled={pending || !password || !confirmed}>
                  {pending ? t("deleting") : t("deleteSubmit")}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  {t("cancel")}
                </Button>
              </div>
            </form>
          ) : (
            <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setOpen(true)}>
              {t("delete")}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
