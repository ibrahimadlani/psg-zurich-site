"use client";

import { Ban, Check, ChevronUp, Copy, ShieldCheck, SlidersHorizontal, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useOptimistic, useState, useTransition } from "react";
import { notify } from "@/lib/notify";
import { useConfirm } from "@/components/admin/ui/confirm-dialog";
import { ResponsivePanel, useIsDesktop } from "@/components/admin/ui/responsive-panel";
import { adminButton, adminLabel } from "@/components/admin/ui/styles";
import type { ContactStatus } from "@/db/schema";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type Patch = { status?: ContactStatus; assignedToId?: string | null };

const select =
  "h-11 w-full min-w-0 cursor-pointer rounded-[8px] border border-input bg-background px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 lg:h-9 lg:text-sm dark:bg-input/30";

/**
 * Status and owner of a conversation (native selects: the phone's own picker), spam and deletion.
 * Changes show at once; a status change can be undone from its toast.
 */
type Props = Parameters<typeof ThreadActions>[0];

/**
 * Computer: the controls in the page. Phone: one line (status, who has it) that opens them in a
 * sheet from the bottom, so the conversation starts right under the sender's name.
 */
export function ThreadActionsBar(props: Props) {
  const t = useTranslations("AdminMessages");
  const desktop = useIsDesktop();
  const [open, setOpen] = useState(false);
  if (desktop) return <ThreadActions {...props} />;
  const owner = props.team.find((person) => person.id === props.assignedToId);
  const status = props.status === "new" ? "open" : props.status;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="flex h-12 w-full cursor-pointer items-center gap-3 rounded-[10px] border bg-card px-3.5 text-left text-[14px]">
        <SlidersHorizontal className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="min-w-0 flex-1 truncate">
          <span className="font-semibold">{t(`statuses.${status}`)}</span>
          <span className="text-muted-foreground"> · {owner ? owner.name || owner.email : t("nobody")}</span>
        </span>
        <span className="shrink-0 text-[13px] text-muted-foreground">{t("actions")}</span>
        <ChevronUp className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </button>
      <ResponsivePanel open={open} onOpenChange={setOpen} title={t("actions")}>
        <ThreadActions {...props} />
      </ResponsivePanel>
    </>
  );
}

export function ThreadActions({
  id,
  reference,
  email,
  status,
  assignedToId,
  team,
  canDelete,
}: {
  id: string;
  reference: string;
  email: string;
  status: ContactStatus;
  assignedToId: string | null;
  team: { id: string; name: string; email: string }[];
  canDelete: boolean;
}) {
  const t = useTranslations("AdminMessages");
  const router = useRouter();
  const ask = useConfirm();
  const [pending, startTransition] = useTransition();
  const [shown, setShown] = useOptimistic({ status, assignedToId }, (current, patch: Patch) => ({ ...current, ...patch }));

  const save = (patch: Patch, undo?: Patch) =>
    startTransition(async () => {
      setShown(patch);
      const response = await fetch(`/api/v1/admin/messages/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(patch) });
      if (!response.ok) return void notify.error(t("error"));
      if (undo) notify.undo(t("saved"), { label: t("undo"), onUndo: () => save(undo) });
      else notify.success(t("saved"));
      router.refresh();
    });

  const spam = shown.status === "spam";
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1.5">
          <span className={adminLabel}>{t("status")}</span>
          <select
            value={shown.status === "new" ? "open" : shown.status}
            disabled={pending}
            onChange={(event) => save({ status: event.target.value as ContactStatus }, { status: shown.status })}
            className={select}
          >
            {(["open", "answered", "closed"] as const).map((value) => (
              <option key={value} value={value}>
                {t(`statuses.${value}`)}
              </option>
            ))}
            {spam ? <option value="spam">{t("statuses.spam")}</option> : null}
          </select>
        </label>
        <label className="space-y-1.5">
          <span className={adminLabel}>{t("assignee")}</span>
          <select
            value={shown.assignedToId ?? ""}
            disabled={pending}
            onChange={(event) => save({ assignedToId: event.target.value || null })}
            className={select}
          >
            <option value="">{t("nobody")}</option>
            {team.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name || person.email}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={adminButton("secondary", "sm")}
          onClick={() => {
            void navigator.clipboard?.writeText(email).then(() => notify.success(t("emailCopied")));
          }}
        >
          <Copy aria-hidden />
          {t("copyEmail")}
        </button>
        <button
          type="button"
          disabled={pending}
          className={adminButton("secondary", "sm")}
          onClick={() => save({ status: spam ? "open" : "spam" }, { status: shown.status })}
        >
          {spam ? <ShieldCheck aria-hidden /> : <Ban aria-hidden />}
          {spam ? t("notSpam") : t("markSpam")}
        </button>
        {shown.status !== "closed" && !spam ? (
          <button type="button" disabled={pending} className={adminButton("secondary", "sm")} onClick={() => save({ status: "closed" }, { status: shown.status })}>
            <Check aria-hidden />
            {t("close")}
          </button>
        ) : null}
        {canDelete ? (
          <button
            type="button"
            disabled={pending}
            className={cn(adminButton("ghost", "sm"), "text-destructive hover:text-destructive")}
            onClick={async () => {
              if ((await ask({ title: t("deleteTitle"), body: t("deleteBody", { reference }), confirmLabel: t("delete"), tone: "danger" })) === null) return;
              startTransition(async () => {
                const response = await fetch(`/api/v1/admin/messages/${id}`, { method: "DELETE" });
                if (!response.ok) return void notify.error(t("error"));
                notify.afterNavigation("success", t("deleted"));
                router.push("/admin/messages");
                router.refresh();
              });
            }}
          >
            <Trash2 aria-hidden />
            {t("delete")}
          </button>
        ) : null}
      </div>
    </div>
  );
}
