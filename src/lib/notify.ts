"use client";

import { toast } from "sonner";

/*
 * The one way the site shows a toast (shown by <Toaster />, components/ui/toaster.tsx). Same
 * rules everywhere:
 *   success 4 s · info 5 s · error 7 s (time to read it; the same error twice shows once) ·
 *   undo 8 s with its button.
 * A toast tied to a navigation (signed in → home, deleted → list…) goes through
 * `afterNavigation`: it waits for the next page and shows there (<PendingToasts />), instead of
 * running out while that page loads.
 */

type Kind = "success" | "error" | "info";
type Options = {
  description?: string;
  action?: { label: string; onClick: () => void };
  /** Only for a message that needs longer to read (e.g. "check your inbox"). */
  duration?: number;
};

const DURATION: Record<Kind, number> = { success: 4000, info: 5000, error: 7000 };

function show(kind: Kind, message: string, options: Options = {}) {
  const { duration, ...rest } = options;
  return toast[kind](message, {
    ...rest,
    duration: duration ?? DURATION[kind],
    // An error repeated (a button clicked twice) replaces itself instead of stacking.
    ...(kind === "error" ? { id: `error:${message}` } : {}),
  });
}

/** A message waiting for the next page: text, or a translation key ("Settings.saved") read there. */
export type PendingToast = { kind: Kind; message?: string; key?: string; description?: string; from: string; at: number };
export const PENDING_KEY = "psgz:pending-toast";

export const notify = {
  success: (message: string, options?: Options) => show("success", message, options),
  info: (message: string, options?: Options) => show("info", message, options),
  error: (message: string, options?: Options) => show("error", message, options),

  /** Something done that can be taken back: the "Undo" button stays 8 s. */
  undo: (message: string, { label, onUndo }: { label: string; onUndo: () => void }) =>
    toast.success(message, { duration: 8000, action: { label, onClick: onUndo } }),

  /**
   * Shown on the page the app is about to open. `message` is the text, or `{ key }` for a
   * translation looked up there (when the language itself changes).
   */
  afterNavigation(kind: Kind, message: string | { key: string }, options: Pick<Options, "description"> = {}) {
    const pending: PendingToast = {
      kind,
      ...(typeof message === "string" ? { message } : { key: message.key }),
      description: options.description,
      from: window.location.pathname,
      at: Date.now(),
    };
    try {
      sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending));
    } catch {
      // No storage (private browsing, blocked): show it now rather than never.
      if (pending.message) show(kind, pending.message, options);
    }
  },
};
