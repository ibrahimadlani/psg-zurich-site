"use client";

import { Lock, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { AutoTextarea } from "@/components/contact/auto-textarea";
import { adminButton } from "@/components/admin/ui/styles";
import { useKeyboardInset } from "@/hooks/use-keyboard-inset";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type Mode = "reply" | "note";

const draftKey = (id: string) => `psgz-admin-reply:${id}`;
function readDraft(id: string) {
  try {
    return localStorage.getItem(draftKey(id)) ?? "";
  } catch {
    return "";
  }
}
function writeDraft(id: string, text: string) {
  try {
    if (text) localStorage.setItem(draftKey(id), text);
    else localStorage.removeItem(draftKey(id));
  } catch {
    // Private mode: the draft just isn't kept.
  }
}

/**
 * The committee's writing box, stuck to the bottom of the conversation (above the phone's tab bar,
 * or above the keyboard while typing): a reply emailed to the sender, or an internal note.
 * Templates fill in a ready answer in the sender's language; the draft survives a reload.
 */
export function AdminComposer({
  id,
  name,
  email,
  templates,
}: {
  id: string;
  name: string;
  email: string;
  templates: { key: string; label: string; text: string }[];
}) {
  const t = useTranslations("AdminMessages");
  const router = useRouter();
  const keyboard = useKeyboardInset();
  const [mode, setMode] = useState<Mode>("reply");
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();

  // The draft comes back after the first paint (the server knows nothing about it).
  useEffect(() => {
    const saved = readDraft(id);
    if (saved) queueMicrotask(() => setBody((current) => current || saved));
  }, [id]);
  const ready = body.trim().length >= 2;

  const update = (text: string) => {
    setBody(text);
    if (mode === "reply") writeDraft(id, text);
  };

  const send = (close = false) =>
    startTransition(async () => {
      const response = await fetch(`/api/v1/admin/messages/${id}/reply`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: body.trim(), kind: mode, close }),
      });
      if (!response.ok) return void toast.error(t("error"));
      toast.success(mode === "reply" ? t("sent", { email }) : t("noteSaved"));
      setBody("");
      writeDraft(id, "");
      router.refresh();
      // Show what was just added, at the end of the conversation.
      window.setTimeout(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" }), 400);
    });

  return (
    <div
      style={keyboard ? { bottom: keyboard } : undefined}
      className={cn(
        "sticky z-30 -mx-4 border-t bg-background/95 px-4 pt-3 pb-3 backdrop-blur-md sm:-mx-6 sm:px-6 lg:mx-0 lg:rounded-[14px] lg:border lg:px-4",
        keyboard ? "" : "bottom-[calc(4rem+1px+env(safe-area-inset-bottom))] lg:bottom-4",
      )}
    >
      <div className="mb-2 flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none]">
        <div role="radiogroup" className="inline-flex shrink-0 gap-0.5 rounded-[8px] border bg-card p-0.5">
          {(["reply", "note"] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={mode === value}
              onClick={() => setMode(value)}
              className={cn(
                "inline-flex h-8 cursor-pointer items-center gap-1 rounded-[6px] px-2.5 text-[12px] font-semibold transition-colors",
                mode === value ? (value === "note" ? "bg-amber-400/25 text-foreground" : "bg-segment text-segment-foreground shadow-brand") : "text-muted-foreground",
              )}
            >
              {value === "note" ? <Lock className="size-3" aria-hidden /> : null}
              {value === "reply" ? t("reply") : t("note")}
            </button>
          ))}
        </div>
        {mode === "reply"
          ? templates.map((template) => (
              <button
                key={template.key}
                type="button"
                onClick={() => update(template.text)}
                className="h-8 shrink-0 cursor-pointer rounded-full border bg-card px-3 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
              >
                {template.label}
              </button>
            ))
          : <span className="text-[12px] text-muted-foreground">{t("noteHint")}</span>}
      </div>
      <div className="flex items-end gap-2">
        <AutoTextarea
          value={body}
          onChange={(event) => update(event.target.value)}
          minRows={2}
          maxRows={6}
          maxLength={5000}
          placeholder={mode === "reply" ? t("replyPlaceholder", { name }) : t("notePlaceholder")}
          aria-label={mode === "reply" ? t("reply") : t("note")}
          enterKeyHint="enter"
          className={cn(
            "min-w-0 flex-1 rounded-[12px] border border-input bg-background px-3 py-2.5 text-base leading-6 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 lg:text-[15px] dark:bg-input/30",
            mode === "note" && "border-amber-500/40 bg-amber-400/10",
          )}
        />
        <button
          type="button"
          disabled={!ready || pending}
          onClick={() => send(false)}
          aria-label={mode === "reply" ? t("send") : t("addNote")}
          className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-full bg-psg-blue text-white transition-[opacity,transform] active:scale-95 disabled:opacity-40 dark:bg-white dark:text-psg-blue"
        >
          <Send className="size-4" aria-hidden />
        </button>
      </div>
      {mode === "reply" ? (
        <div className="mt-2 flex justify-end">
          <button type="button" disabled={!ready || pending} onClick={() => send(true)} className={adminButton("ghost", "sm")}>
            {t("sendClose")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
