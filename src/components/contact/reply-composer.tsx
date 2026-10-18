"use client";

import { Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { notify } from "@/lib/notify";
import { AutoTextarea } from "@/components/contact/auto-textarea";
import { useKeyboardInset } from "@/hooks/use-keyboard-inset";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const key = (target: string) => `psgz-contact-reply:${target}`;

/**
 * The sender's answer box under a conversation, stuck to the bottom of the screen (above the
 * keyboard while typing). Members are identified by their session, visitors by their private link.
 */
export function ReplyComposer({ threadId, token }: { threadId?: string; token?: string }) {
  const t = useTranslations("ContactThread");
  const router = useRouter();
  const keyboard = useKeyboardInset();
  const target = threadId ?? token ?? "";
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let saved = "";
    try {
      saved = localStorage.getItem(key(target)) ?? "";
    } catch {
      // Storage blocked.
    }
    if (saved) queueMicrotask(() => setBody((current) => current || saved));
  }, [target]);

  const update = (text: string) => {
    setBody(text);
    try {
      if (text) localStorage.setItem(key(target), text);
      else localStorage.removeItem(key(target));
    } catch {
      // Storage blocked: nothing kept.
    }
  };

  const send = () =>
    startTransition(async () => {
      const response = await fetch("/api/v1/contact/reply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...(threadId ? { threadId } : { token }), body: body.trim() }),
      });
      if (!response.ok) return void notify.error(t("error"));
      notify.success(t("sent"));
      update("");
      router.refresh();
      window.setTimeout(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" }), 400);
    });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (body.trim().length >= 2 && !pending) send();
      }}
      style={keyboard ? { bottom: keyboard } : undefined}
      className={cn(
        "sticky z-20 -mx-4 flex items-end gap-2 border-t bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:mx-0 sm:rounded-[16px] sm:border sm:px-3 sm:pb-3",
        keyboard ? "" : "bottom-0 sm:bottom-4",
      )}
    >
      <AutoTextarea
        value={body}
        onChange={(event) => update(event.target.value)}
        minRows={1}
        maxRows={6}
        maxLength={5000}
        placeholder={t("replyPlaceholder")}
        aria-label={t("replyPlaceholder")}
        className="min-w-0 flex-1 rounded-[20px] border border-input bg-background px-4 py-2.5 text-base leading-6 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:text-[15px] dark:bg-input/30"
      />
      <button
        type="submit"
        disabled={body.trim().length < 2 || pending}
        aria-label={t("send")}
        className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-full bg-psg-blue text-white transition-[opacity,transform] active:scale-95 disabled:opacity-40 dark:bg-white dark:text-psg-blue"
      >
        <Send className="size-4" aria-hidden />
      </button>
    </form>
  );
}
