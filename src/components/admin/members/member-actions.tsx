"use client";

import { Ban, Check, MailWarning, Pencil, RotateCcw, Wallet, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { MemberEditPanel, type MemberEditValues } from "@/components/admin/members/member-edit-panel";
import { useConfirm } from "@/components/admin/ui/confirm-dialog";
import { adminButton } from "@/components/admin/ui/styles";
import type { MemberStatus } from "@/db/schema";
import { useRouter } from "@/i18n/navigation";

type Props = {
  id: string;
  name: string;
  status: MemberStatus;
  emailVerified: boolean;
  paid: boolean;
  canWrite: boolean;
  profile: MemberEditValues;
};

async function send(url: string, body: unknown, method = "POST") {
  const response = await fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return response.ok;
}

/**
 * What the committee can do with this member, the likely next step first: decide on a request
 * (accepting can record the fee in the same go), take the fee, nudge, edit, suspend.
 */
export function MemberActions({ id, name, status, emailVerified, paid, canWrite, profile }: Props) {
  const t = useTranslations("AdminMembers");
  const router = useRouter();
  const ask = useConfirm();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);

  const run = (work: () => Promise<boolean>, success: string, undo?: () => Promise<boolean>) =>
    startTransition(async () => {
      if (!(await work())) {
        toast.error(t("error"));
        return;
      }
      toast.success(success, undo ? { action: { label: t("undo"), onClick: () => void undo().then(() => router.refresh()) } } : undefined);
      router.refresh();
    });

  if (!canWrite) return null;

  const decide = (decision: "approve" | "reject", extra: Record<string, unknown> = {}) => send(`/api/v1/members/${id}`, { decision, ...extra }, "PATCH");
  const dues = (value: boolean) => send(`/api/v1/members/${id}/dues`, { paid: value });

  return (
    <div className="flex flex-wrap gap-2">
      {status === "pending" || status === "rejected" ? (
        emailVerified ? (
          <>
            {/* The usual case: the fee came with the request (TWINT, cash at the bar). */}
            <button type="button" disabled={pending} className={adminButton("primary")} onClick={() => run(() => decide("approve", { withDues: true }), t("approvedPaid"))}>
              <Check aria-hidden />
              {t("approvePaid")}
            </button>
            <button type="button" disabled={pending} className={adminButton("secondary")} onClick={() => run(() => decide("approve"), t("approved"))}>
              {t("approveOnly")}
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={pending}
            className={adminButton("primary")}
            onClick={() => run(() => send("/api/v1/members/reminders", { ids: [id], kind: "verify" }), t("verifyReminded"))}
          >
            <MailWarning aria-hidden />
            {t("remindVerify")}
          </button>
        )
      ) : null}
      {status === "pending" ? (
        <button
          type="button"
          disabled={pending}
          className={adminButton("danger")}
          onClick={async () => {
            const reason = await ask({
              title: t("rejectTitle", { name }),
              body: t("rejectBody"),
              confirmLabel: t("reject"),
              tone: "danger",
              input: { label: t("rejectReason"), placeholder: t("rejectReasonHint") },
            });
            if (reason !== null) run(() => decide("reject", { reason }), t("rejected"));
          }}
        >
          <X aria-hidden />
          {t("reject")}
        </button>
      ) : null}

      {status === "active" ? (
        paid ? (
          <button
            type="button"
            disabled={pending}
            className={adminButton("secondary")}
            onClick={async () => {
              if ((await ask({ title: t("cancelDuesTitle"), body: t("cancelDuesBody", { name }), confirmLabel: t("cancelDues"), tone: "danger" })) !== null) {
                run(() => dues(false), t("duesCancelled"));
              }
            }}
          >
            <RotateCcw aria-hidden />
            {t("cancelDues")}
          </button>
        ) : (
          <>
            <button type="button" disabled={pending} className={adminButton("primary")} onClick={() => run(() => dues(true), t("duesRecorded"), () => dues(false))}>
              <Wallet aria-hidden />
              {t("recordDues")}
            </button>
            <button
              type="button"
              disabled={pending}
              className={adminButton("secondary")}
              onClick={() => run(() => send("/api/v1/members/reminders", { ids: [id], kind: "fee" }), t("feeReminded"))}
            >
              <MailWarning aria-hidden />
              {t("remindFee")}
            </button>
          </>
        )
      ) : null}

      <button type="button" disabled={pending} className={adminButton("secondary")} onClick={() => setEditing(true)}>
        <Pencil aria-hidden />
        {t("edit")}
      </button>

      {status === "active" ? (
        <button
          type="button"
          disabled={pending}
          className={adminButton("ghost")}
          onClick={async () => {
            if ((await ask({ title: t("suspendTitle", { name }), body: t("suspendBody"), confirmLabel: t("suspend"), tone: "danger" })) !== null) {
              run(() => send(`/api/v1/members/${id}`, { action: "suspend" }, "PATCH"), t("suspended"));
            }
          }}
        >
          <Ban aria-hidden />
          {t("suspend")}
        </button>
      ) : null}
      {status === "suspended" ? (
        <button type="button" disabled={pending} className={adminButton("primary")} onClick={() => run(() => send(`/api/v1/members/${id}`, { action: "reactivate" }, "PATCH"), t("reactivated"))}>
          <RotateCcw aria-hidden />
          {t("reactivate")}
        </button>
      ) : null}

      <MemberEditPanel id={id} open={editing} onOpenChange={setEditing} defaults={profile} />
    </div>
  );
}
