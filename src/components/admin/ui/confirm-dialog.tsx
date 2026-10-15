"use client";

import { useTranslations } from "next-intl";
import { AlertDialog } from "radix-ui";
import { createContext, useCallback, useContext, useId, useRef, useState } from "react";
import { adminButton, adminInput } from "@/components/admin/ui/styles";

type Options = {
  title: string;
  body?: string;
  confirmLabel?: string;
  tone?: "default" | "danger";
  /** Asks for a short text too (a reason): the answer is what `ask` resolves with. */
  input?: { label: string; placeholder?: string; required?: boolean };
  /** The admin must type this exact text to confirm (deleting something important). */
  typeToConfirm?: string;
};

type Ask = (options: Options) => Promise<string | null>;
const Context = createContext<Ask | null>(null);

/**
 * Replaces the browser's confirm(): one dialog for the whole admin, opened with
 * `const ask = useConfirm(); if ((await ask({...})) === null) return;`
 * It resolves with the text typed (or "") when confirmed, null when cancelled.
 */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const t = useTranslations("AdminShell.confirm");
  const [options, setOptions] = useState<Options | null>(null);
  const [value, setValue] = useState("");
  const resolver = useRef<((answer: string | null) => void) | null>(null);
  const fieldId = useId();

  const ask = useCallback<Ask>(
    (next) =>
      new Promise((resolve) => {
        resolver.current?.(null);
        resolver.current = resolve;
        setValue("");
        setOptions(next);
      }),
    [],
  );

  const close = (answer: string | null) => {
    resolver.current?.(answer);
    resolver.current = null;
    setOptions(null);
  };

  const blocked =
    (options?.input?.required && value.trim() === "") ||
    (options?.typeToConfirm !== undefined && value.trim() !== options.typeToConfirm);

  return (
    <Context.Provider value={ask}>
      {children}
      <AlertDialog.Root open={options !== null} onOpenChange={(open) => (open ? null : close(null))}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[3px] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
          <AlertDialog.Content className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-50 rounded-[16px] border bg-popover p-5 shadow-xl duration-200 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-4 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-[min(28rem,calc(100vw-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=open]:zoom-in-95">
            {options ? (
              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!blocked) close(value.trim());
                }}
              >
                <div className="space-y-1.5">
                  <AlertDialog.Title className="font-narrow text-[26px] leading-none font-extrabold uppercase italic">{options.title}</AlertDialog.Title>
                  {options.body ? (
                    <AlertDialog.Description className="text-sm text-pretty text-muted-foreground">{options.body}</AlertDialog.Description>
                  ) : (
                    <AlertDialog.Description className="sr-only">{options.title}</AlertDialog.Description>
                  )}
                </div>
                {options.input || options.typeToConfirm !== undefined ? (
                  <div className="space-y-1.5">
                    <label htmlFor={fieldId} className="text-[13px] font-medium">
                      {options.input?.label ?? t("typeToConfirm", { text: options.typeToConfirm ?? "" })}
                    </label>
                    {options.input ? (
                      <textarea
                        id={fieldId}
                        autoFocus
                        rows={3}
                        value={value}
                        maxLength={500}
                        placeholder={options.input.placeholder}
                        onChange={(event) => setValue(event.target.value)}
                        className={`${adminInput} h-auto py-2 lg:h-auto`}
                      />
                    ) : (
                      <input id={fieldId} autoFocus autoComplete="off" value={value} onChange={(event) => setValue(event.target.value)} className={adminInput} />
                    )}
                  </div>
                ) : null}
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <AlertDialog.Cancel type="button" className={adminButton("secondary")}>
                    {t("cancel")}
                  </AlertDialog.Cancel>
                  <button type="submit" disabled={blocked} className={adminButton(options.tone === "danger" ? "danger" : "primary")}>
                    {options.confirmLabel ?? t("confirm")}
                  </button>
                </div>
              </form>
            ) : null}
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </Context.Provider>
  );
}

export function useConfirm(): Ask {
  const ask = useContext(Context);
  // Outside the admin shell: fall back to the browser's dialog.
  return ask ?? (async (options) => (window.confirm(options.body ? `${options.title}\n\n${options.body}` : options.title) ? "" : null));
}
