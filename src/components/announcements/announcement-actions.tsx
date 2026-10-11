"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";

export function AnnouncementActions({ id, active }: { id: string; active: boolean }) {
  const t = useTranslations("AdminBanner");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const run = (request: () => Promise<Response>) =>
    startTransition(async () => {
      await request();
      router.refresh();
    });

  return (
    <div className="flex shrink-0 gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() =>
          run(() =>
            fetch(`/api/v1/announcements/${id}`, {
              method: "PATCH",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ active: !active }),
            }),
          )
        }
      >
        {active ? t("deactivate") : t("activate")}
      </Button>
      <Button
        variant="destructive"
        size="sm"
        disabled={pending}
        onClick={() => {
          if (confirm(t("confirmDelete"))) run(() => fetch(`/api/v1/announcements/${id}`, { method: "DELETE" }));
        }}
      >
        {t("delete")}
      </Button>
    </div>
  );
}
