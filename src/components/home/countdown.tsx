"use client";

import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";

// One clock for the page, ticking each second while it is shown.
const listeners = new Set<() => void>();
let timer: number | undefined;
function subscribe(listener: () => void) {
  listeners.add(listener);
  timer ??= window.setInterval(() => listeners.forEach((notify) => notify()), 1000);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.clearInterval(timer);
      timer = undefined;
    }
  };
}
const now = () => Math.floor(Date.now() / 1000);

/**
 * Time left before kick-off, in the scoreboard's figures: days / hours / minutes / seconds,
 * the days dropped on match day. Nothing on the server (the clocks would not agree).
 */
export function Countdown({ to, className }: { to: string; className?: string }) {
  const t = useTranslations("Home.countdown");
  const seconds = useSyncExternalStore(subscribe, now, () => null);
  if (seconds === null) return <div className={className} aria-hidden style={{ minHeight: "3.5rem" }} />;
  const left = Math.max(0, Math.floor(new Date(to).getTime() / 1000) - seconds);
  if (left === 0) return null;
  const parts = [
    { value: Math.floor(left / 86400), label: t("days") },
    { value: Math.floor((left % 86400) / 3600), label: t("hours") },
    { value: Math.floor((left % 3600) / 60), label: t("minutes") },
    { value: left % 60, label: t("seconds") },
  ].filter((part, index) => index > 0 || part.value > 0);
  return (
    <div className={className} role="timer" aria-label={t("label")}>
      <div className="flex items-start justify-center gap-[clamp(10px,3vw,22px)]">
        {parts.map((part) => (
          <div key={part.label} className="flex min-w-[2.6ch] flex-col items-center">
            <span className="font-narrow text-[length:clamp(32px,7vw,52px)] leading-none font-extrabold tabular-nums italic">{String(part.value).padStart(2, "0")}</span>
            <span className="mt-1 font-wide text-[9px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">{part.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
