"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { notify } from "@/lib/notify";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "@/i18n/navigation";

const PATTERN = /^[\p{L}\p{N} ._-]{3,32}$/u;

/** Leaderboard name: a nickname, or "First L." when empty. */
export function NicknameForm({ initial, fallback }: { initial: string; fallback: string }) {
  const t = useTranslations("Settings.profile");
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [pending, startTransition] = useTransition();
  const trimmed = value.trim();

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    if (trimmed && !PATTERN.test(trimmed)) {
      notify.error(t("nicknameMessages.invalid"));
      return;
    }
    startTransition(async () => {
      const response = await fetch("/api/v1/me/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nickname: trimmed }),
      });
      if (!response.ok) {
        notify.error(t(`nicknameMessages.${response.status === 409 ? "taken" : response.status === 400 ? "invalid" : "error"}`));
        return;
      }
      setSaved(trimmed);
      notify.success(t("nicknameMessages.saved"));
      router.refresh();
    });
  };

  return (
    <form onSubmit={save} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="nickname" className="sr-only">
          {t("nickname")}
        </Label>
        <div className="flex gap-2">
          <Input id="nickname" value={value} maxLength={32} placeholder={fallback} onChange={(event) => setValue(event.target.value)} />
          <Button type="submit" disabled={pending || trimmed === saved}>
            {t("save")}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{t("nicknamePreview", { name: trimmed || fallback })}</p>
      </div>
    </form>
  );
}
