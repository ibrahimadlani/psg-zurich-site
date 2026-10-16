"use client";

import { UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useConfirm } from "@/components/admin/ui/confirm-dialog";
import { adminButton, adminInput } from "@/components/admin/ui/styles";
import { useRouter } from "@/i18n/navigation";

type TeamRole = "moderator" | "admin";

function useRoleChange() {
  const t = useTranslations("AdminRoles");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const change = (email: string, role: TeamRole | "member", onDone?: () => void) =>
    startTransition(async () => {
      const response = await fetch("/api/v1/users/role", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      if (!response.ok) {
        const code = ((await response.json().catch(() => null)) as { error?: { code?: string } } | null)?.error?.code;
        toast.error(t(`errors.${code === "not_found" || code === "self" || code === "superadmin" ? code : "error"}`));
        return;
      }
      toast.success(role === "member" ? t("removed", { email }) : t("changed", { email, role: t(`roles.${role}`) }));
      onDone?.();
      router.refresh();
    });
  return { pending, change };
}

const segment = (on: boolean) =>
  `h-8 cursor-pointer rounded-[6px] px-2.5 font-wide text-[9.5px] font-semibold tracking-[0.06em] uppercase transition-colors ${
    on ? "bg-segment text-segment-foreground shadow-brand" : "text-muted-foreground hover:text-foreground"
  }`;

/** Role of a team member: moderator ↔ admin in one tap, or out of the team. */
export function TeamRoleControls({ email, role }: { email: string; role: TeamRole }) {
  const t = useTranslations("AdminRoles");
  const ask = useConfirm();
  const { pending, change } = useRoleChange();
  return (
    <div className="flex items-center gap-2">
      <div role="radiogroup" aria-label={t("roleLabel")} className="inline-flex gap-0.5 rounded-[8px] border bg-card p-0.5">
        {(["moderator", "admin"] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={role === value}
            disabled={pending}
            onClick={() => (role === value ? null : change(email, value))}
            className={segment(role === value)}
          >
            {t(`roles.${value}`)}
          </button>
        ))}
      </div>
      <button
        type="button"
        disabled={pending}
        className={adminButton("ghost", "sm")}
        onClick={async () => {
          if ((await ask({ title: t("removeTitle"), body: t("confirmRemove", { email }), confirmLabel: t("remove"), tone: "danger" })) !== null) change(email, "member");
        }}
      >
        {t("remove")}
      </button>
    </div>
  );
}

/** Add someone to the team, by the email of their existing account. */
export function AddTeamMemberForm() {
  const t = useTranslations("AdminRoles");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TeamRole>("moderator");
  const { pending, change } = useRoleChange();
  return (
    <form
      className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]"
      onSubmit={(event) => {
        event.preventDefault();
        if (email.trim()) change(email.trim(), role, () => setEmail(""));
      }}
    >
      <input
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder={t("emailPlaceholder")}
        aria-label={t("emailPlaceholder")}
        className={adminInput}
      />
      <div role="radiogroup" aria-label={t("roleLabel")} className="inline-flex gap-0.5 self-center rounded-[8px] border bg-card p-0.5">
        {(["moderator", "admin"] as const).map((value) => (
          <button key={value} type="button" role="radio" aria-checked={role === value} onClick={() => setRole(value)} className={segment(role === value)}>
            {t(`roles.${value}`)}
          </button>
        ))}
      </div>
      <button type="submit" disabled={pending || !email.trim()} className={adminButton("primary")}>
        <UserPlus aria-hidden />
        {t("add")}
      </button>
    </form>
  );
}

/** The member's role title in the committee, saved when the field is left (empty: not on the contact page). */
export function CommitteeTitleField({ userId, title }: { userId: string; title: string | null }) {
  const t = useTranslations("AdminRoles");
  const router = useRouter();
  const [value, setValue] = useState(title ?? "");
  const [pending, startTransition] = useTransition();
  const save = () => {
    if (value.trim() === (title ?? "")) return;
    startTransition(async () => {
      const response = await fetch("/api/v1/users/committee-title", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId, title: value.trim() }),
      });
      if (!response.ok) return void toast.error(t("errors.error"));
      toast.success(t("committeeTitleSaved"));
      router.refresh();
    });
  };
  return (
    <input
      value={value}
      disabled={pending}
      maxLength={60}
      onChange={(event) => setValue(event.target.value)}
      onBlur={save}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
      }}
      enterKeyHint="done"
      placeholder={t("committeeTitlePlaceholder")}
      aria-label={t("committeeTitle")}
      className={`${adminInput} sm:w-48`}
    />
  );
}
