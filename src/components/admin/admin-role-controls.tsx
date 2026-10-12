"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "@/i18n/navigation";

type Failure = "not_found" | "self" | "superadmin" | "error";

function useRoleChange() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [failure, setFailure] = useState<Failure | null>(null);

  const change = (email: string, role: "member" | "admin", onDone?: () => void) =>
    startTransition(async () => {
      setFailure(null);
      const response = await fetch("/api/v1/users/role", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      if (!response.ok) {
        const code = ((await response.json().catch(() => null)) as { error?: { code?: string } } | null)?.error?.code;
        setFailure(code === "not_found" || code === "self" || code === "superadmin" ? code : "error");
        return;
      }
      onDone?.();
      router.refresh();
    });

  return { pending, failure, change };
}

/** "Name admin" form: by email address of an existing account. */
export function AddAdminForm() {
  const t = useTranslations("AdminRoles");
  const [email, setEmail] = useState("");
  const { pending, failure, change } = useRoleChange();

  return (
    <form
      className="space-y-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (email.trim()) change(email.trim(), "admin", () => setEmail(""));
      }}
    >
      <div className="flex gap-2">
        <Input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={t("emailPlaceholder")}
          aria-label={t("emailPlaceholder")}
          className="flex-1"
        />
        <Button type="submit" disabled={pending || !email.trim()}>
          {t("add")}
        </Button>
      </div>
      {failure ? <p className="text-sm text-destructive">{t(`errors.${failure}`)}</p> : null}
    </form>
  );
}

/** "Remove" button on an admin row. */
export function RemoveAdminButton({ email }: { email: string }) {
  const t = useTranslations("AdminRoles");
  const { pending, failure, change } = useRoleChange();

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => {
          if (confirm(t("confirmRemove", { email }))) change(email, "member");
        }}
      >
        {t("remove")}
      </Button>
      {failure ? <span className="text-xs text-destructive">{t(`errors.${failure}`)}</span> : null}
    </div>
  );
}
