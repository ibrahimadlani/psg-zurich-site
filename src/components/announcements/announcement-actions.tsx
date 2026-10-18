"use client";

import { Eye, EyeOff, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { notify } from "@/lib/notify";
import { useConfirm } from "@/components/admin/ui/confirm-dialog";
import { adminButton } from "@/components/admin/ui/styles";
import { useRouter } from "@/i18n/navigation";

const toggle = (id: string, active: boolean) =>
  fetch(`/api/v1/announcements/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ active }),
  });

/** Show / hide a banner in one tap (with an undo), or delete it. */
export function AnnouncementActions({ id, active, expired }: { id: string; active: boolean; expired: boolean }) {
  const t = useTranslations("AdminBanner");
  const router = useRouter();
  const ask = useConfirm();
  const [pending, startTransition] = useTransition();

  const switchTo = (next: boolean) =>
    startTransition(async () => {
      const response = await toggle(id, next);
      if (!response.ok) {
        notify.error(t("error"));
        return;
      }
      notify.success(t(next ? "activated" : "deactivated"), {
        action: { label: t("undo"), onClick: () => void toggle(id, !next).then(() => router.refresh()) },
      });
      router.refresh();
    });

  return (
    <div className="flex shrink-0 gap-1.5">
      {expired ? null : (
        <button type="button" disabled={pending} onClick={() => switchTo(!active)} className={adminButton(active ? "secondary" : "primary", "sm")}>
          {active ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
          {active ? t("deactivate") : t("activate")}
        </button>
      )}
      <button
        type="button"
        disabled={pending}
        title={t("delete")}
        className={adminButton("ghost", "sm", "text-destructive hover:text-destructive")}
        onClick={async () => {
          if ((await ask({ title: t("delete"), body: t("confirmDelete"), confirmLabel: t("delete"), tone: "danger" })) === null) return;
          startTransition(async () => {
            const response = await fetch(`/api/v1/announcements/${id}`, { method: "DELETE" });
            if (!response.ok) notify.error(t("error"));
            router.refresh();
          });
        }}
      >
        <Trash2 aria-hidden />
        <span className="sr-only">{t("delete")}</span>
      </button>
    </div>
  );
}
