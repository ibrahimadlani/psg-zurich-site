"use client";

import { ArrowDown, ArrowUp, Lock, Plus, Trash2, Unlock, Vote, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { notify } from "@/lib/notify";
import { useConfirm } from "@/components/admin/ui/confirm-dialog";
import { ResponsivePanel } from "@/components/admin/ui/responsive-panel";
import { adminButton, adminInput } from "@/components/admin/ui/styles";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const labelClass = "text-[13px] font-medium";

/** The poll form: question, a few words of context, the choices (reorderable), an end date. */
function PollForm({ onDone }: { onDone: () => void }) {
  const t = useTranslations("AdminPolls");
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [description, setDescription] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [closesAt, setClosesAt] = useState("");
  const [openNow, setOpenNow] = useState(true);
  const [pending, startTransition] = useTransition();

  const filled = options.map((option) => option.trim()).filter(Boolean);
  const valid = question.trim() !== "" && filled.length >= 2;
  const move = (index: number, by: number) =>
    setOptions((current) => {
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(index + by, 0, item!);
      return next;
    });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!valid) return void notify.error(t("invalid"));
    startTransition(async () => {
      const response = await fetch("/api/v1/polls", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          question: question.trim(),
          description: description.trim() || undefined,
          options: filled,
          status: openNow ? "open" : "draft",
          closesAt: closesAt ? new Date(closesAt).toISOString() : undefined,
        }),
      });
      if (!response.ok) return void notify.error(t("error"));
      notify.success(t(openNow ? "createdOpen" : "createdDraft"));
      onDone();
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <div className="space-y-1.5">
        <label htmlFor="poll-question" className={labelClass}>
          {t("question")}
        </label>
        <input id="poll-question" value={question} maxLength={255} onChange={(event) => setQuestion(event.target.value)} placeholder={t("questionPlaceholder")} className={adminInput} />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="poll-description" className={labelClass}>
          {t("descriptionLabel")}
        </label>
        <textarea id="poll-description" rows={2} value={description} maxLength={5000} onChange={(event) => setDescription(event.target.value)} className={cn(adminInput, "h-auto py-2 lg:h-auto")} />
      </div>
      <fieldset className="space-y-2">
        <legend className={cn(labelClass, "mb-1.5")}>{t("options")}</legend>
        {options.map((option, index) => (
          <div key={index} className="flex items-center gap-1.5">
            <span className="w-5 shrink-0 text-center text-[12px] text-muted-foreground tabular-nums">{index + 1}</span>
            <input
              value={option}
              maxLength={255}
              aria-label={t("optionLabel", { number: index + 1 })}
              onChange={(event) => setOptions((current) => current.map((value, at) => (at === index ? event.target.value : value)))}
              className={adminInput}
            />
            <button type="button" disabled={index === 0} onClick={() => move(index, -1)} className={adminButton("ghost", "icon", "size-9 lg:size-8")} title={t("up")}>
              <ArrowUp aria-hidden />
              <span className="sr-only">{t("up")}</span>
            </button>
            <button type="button" disabled={index === options.length - 1} onClick={() => move(index, 1)} className={adminButton("ghost", "icon", "size-9 lg:size-8")} title={t("down")}>
              <ArrowDown aria-hidden />
              <span className="sr-only">{t("down")}</span>
            </button>
            <button
              type="button"
              disabled={options.length <= 2}
              onClick={() => setOptions((current) => current.filter((_, at) => at !== index))}
              className={adminButton("ghost", "icon", "size-9 lg:size-8")}
              title={t("removeOption")}
            >
              <X aria-hidden />
              <span className="sr-only">{t("removeOption")}</span>
            </button>
          </div>
        ))}
        {options.length < 20 ? (
          <button type="button" onClick={() => setOptions((current) => [...current, ""])} className={adminButton("secondary", "sm")}>
            <Plus aria-hidden />
            {t("addOption")}
          </button>
        ) : null}
      </fieldset>
      <div className="space-y-1.5 sm:max-w-xs">
        <label htmlFor="poll-closes" className={labelClass}>
          {t("closesAt")}
        </label>
        <input id="poll-closes" type="datetime-local" value={closesAt} onChange={(event) => setClosesAt(event.target.value)} className={adminInput} />
      </div>
      <label className="flex items-center gap-2.5 text-sm">
        <input type="checkbox" checked={openNow} onChange={(event) => setOpenNow(event.target.checked)} className="size-[18px] accent-psg-blue" />
        {t("openNow")}
      </label>
      <div className="sticky -bottom-5 -mx-5 -mb-5 border-t bg-background px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <button type="submit" disabled={pending || !valid} className={adminButton("primary", "md", "w-full")}>
          {t(openNow ? "createOpen" : "createDraft")}
        </button>
      </div>
    </form>
  );
}

/** "New poll", in the page header. */
export function NewPollButton() {
  const t = useTranslations("AdminPolls");
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={adminButton("primary")}>
        <Vote aria-hidden />
        {t("new")}
      </button>
      <ResponsivePanel open={open} onOpenChange={setOpen} title={t("new")} description={t("newHint")}>
        {open ? <PollForm onDone={() => setOpen(false)} /> : null}
      </ResponsivePanel>
    </>
  );
}

/** Open or close a poll, or delete it. */
export function PollActions({ id, status, question }: { id: string; status: "draft" | "open" | "closed"; question: string }) {
  const t = useTranslations("AdminPolls");
  const router = useRouter();
  const ask = useConfirm();
  const [pending, startTransition] = useTransition();
  const setStatus = (next: "open" | "closed") =>
    startTransition(async () => {
      const response = await fetch(`/api/v1/polls/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: next }) });
      if (!response.ok) return void notify.error(t("error"));
      notify.success(t(next === "open" ? "opened" : "closed"));
      router.refresh();
    });
  return (
    <div className="flex flex-wrap gap-1.5">
      {status === "open" ? (
        <button type="button" disabled={pending} onClick={() => setStatus("closed")} className={adminButton("secondary", "sm")}>
          <Lock aria-hidden />
          {t("close")}
        </button>
      ) : (
        <button type="button" disabled={pending} onClick={() => setStatus("open")} className={adminButton("primary", "sm")}>
          <Unlock aria-hidden />
          {t(status === "draft" ? "open" : "reopen")}
        </button>
      )}
      <button
        type="button"
        disabled={pending}
        title={t("delete")}
        onClick={async () => {
          if ((await ask({ title: t("deleteTitle"), body: t("deleteBody", { question }), confirmLabel: t("delete"), tone: "danger" })) === null) return;
          startTransition(async () => {
            const response = await fetch(`/api/v1/polls/${id}`, { method: "DELETE" });
            if (!response.ok) return void notify.error(t("error"));
            notify.success(t("deleted"));
            router.refresh();
          });
        }}
        className={adminButton("ghost", "sm", "text-destructive hover:text-destructive")}
      >
        <Trash2 aria-hidden />
        <span className="sr-only">{t("delete")}</span>
      </button>
    </div>
  );
}
