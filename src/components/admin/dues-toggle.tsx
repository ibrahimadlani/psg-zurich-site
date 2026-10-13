"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";

/** Records the member's fee for the season, or cancels it. */
export function DuesToggle({ id, paid }: { id: string; paid: boolean }) {
  const t = useTranslations("AdminDues");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const send = (next: boolean) =>
    startTransition(async () => {
      const response = await fetch(`/api/v1/members/${id}/dues`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ paid: next }),
      });
      if (!response.ok) {
        toast.error(t("error"));
        return;
      }
      toast.success(t(next ? "recorded" : "cancelled"));
      router.refresh();
    });

  return paid ? (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending}
      className="shrink-0 text-muted-foreground"
      onClick={() => {
        if (confirm(t("confirmCancel"))) send(false);
      }}
    >
      {t("cancel")}
    </Button>
  ) : (
    <Button size="sm" disabled={pending} className="shrink-0" onClick={() => send(true)}>
      {t("record")}
    </Button>
  );
}
