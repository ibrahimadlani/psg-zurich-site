"use client";

import { X } from "lucide-react";
import { useSyncExternalStore } from "react";
import type { announcements } from "@/db/schema";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "psgz-banner-dismissed";
const CHANGE_EVENT = "psgz-banner-change";

type Tone = (typeof announcements.$inferSelect)["tone"];

const TONES: Record<Tone, string> = {
  info: "bg-primary text-primary-foreground",
  maintenance: "bg-psg-blue text-white dark:bg-foreground dark:text-background",
  urgent: "bg-psg-red text-white",
};

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function readDismissed() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

type Props = {
  storageKey: string;
  tone: Tone;
  title: string;
  message: string;
  linkUrl: string | null;
  closeLabel: string;
  learnMore: string;
};

export function AnnouncementBar({ storageKey, tone, title, message, linkUrl, closeLabel, learnMore }: Props) {
  // undefined on the server: stay collapsed until the browser knows whether it was dismissed.
  const dismissed = useSyncExternalStore(subscribe, readDismissed, () => undefined);
  const open = dismissed !== undefined && dismissed !== storageKey;

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, storageKey);
    } catch {
      // Private mode: the event below still hides it for this page view.
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  return (
    // Opens and closes smoothly by animating the grid row between 0fr and 1fr.
    <div
      inert={!open}
      className={cn(
        // Hidden on bare pages (sign-in screens, 404): see BrandShell.
        "grid [transition:grid-template-rows_.3s_ease,opacity_.25s_ease] [body:has([data-bare-page])_&]:hidden",
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
      )}
    >
      <div className="min-h-0 overflow-hidden">
        <aside aria-label={title} className={cn("relative", TONES[tone])}>
          <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-1.5">
            <span aria-hidden className="size-6 shrink-0" />
            <p className="min-w-0 flex-1 truncate text-center text-[13px] leading-5">
              <strong className="font-semibold">{title}</strong>
              <span className="opacity-85"> · {message}</span>
              {linkUrl ? (
                <a href={linkUrl} className="ml-2 font-semibold underline underline-offset-2">
                  {learnMore}
                </a>
              ) : null}
            </p>
            <button
              type="button"
              onClick={dismiss}
              aria-label={closeLabel}
              title={closeLabel}
              className="grid size-6 shrink-0 cursor-pointer place-items-center rounded-[5px] opacity-75 transition-opacity hover:opacity-100 focus-visible:opacity-100"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
