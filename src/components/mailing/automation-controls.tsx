"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const UNITS = { minutes: 1, hours: 60, days: 1440 } as const;
type Unit = keyof typeof UNITS;

/** Biggest unit that divides the delay ("2 days" rather than "2880 minutes"). */
function split(minutes: number): { value: number; unit: Unit } {
  if (minutes > 0 && minutes % 1440 === 0) return { value: minutes / 1440, unit: "days" };
  if (minutes > 0 && minutes % 60 === 0) return { value: minutes / 60, unit: "hours" };
  return { value: minutes, unit: "minutes" };
}

/** On/off switch and delay of one automation, saved as soon as they change. */
export function AutomationControls({ automationKey, enabled, delayMinutes }: { automationKey: string; enabled: boolean; delayMinutes: number }) {
  const t = useTranslations("Mailing");
  const router = useRouter();
  const [on, setOn] = useState(enabled);
  const [delay, setDelay] = useState(split(delayMinutes));
  const [pending, startTransition] = useTransition();

  const save = (body: { enabled?: boolean; delayMinutes?: number }, rollback: () => void) =>
    startTransition(async () => {
      const response = await fetch(`/api/v1/mailing/automations/${automationKey}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        rollback();
        toast.error(t("error"));
        return;
      }
      toast.success(t("saved"));
      router.refresh();
    });

  const commitDelay = (next: { value: number; unit: Unit }) => {
    const previous = delay;
    setDelay(next);
    save({ delayMinutes: Math.max(0, Math.round(next.value)) * UNITS[next.unit] }, () => setDelay(previous));
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {t("delay")}
        <input
          type="number"
          min={0}
          inputMode="numeric"
          defaultValue={delay.value}
          key={`${delay.value}-${delay.unit}`}
          disabled={pending}
          onBlur={(event) => {
            const value = Number(event.target.value);
            if (Number.isFinite(value) && value !== delay.value) commitDelay({ ...delay, value });
          }}
          className="h-8 w-16 rounded-lg border border-input bg-transparent px-2 text-sm text-foreground outline-none focus-visible:border-ring dark:bg-input/30"
        />
        <select
          value={delay.unit}
          disabled={pending}
          onChange={(event) => commitDelay({ ...delay, unit: event.target.value as Unit })}
          className="h-8 rounded-lg border border-input bg-transparent px-1.5 text-sm text-foreground outline-none dark:bg-input/30"
        >
          {(Object.keys(UNITS) as Unit[]).map((unit) => (
            <option key={unit} value={unit}>
              {t(unit)}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={t("enabled")}
        disabled={pending}
        onClick={() => {
          const next = !on;
          setOn(next);
          save({ enabled: next }, () => setOn(!next));
        }}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:cursor-default",
          on ? "bg-segment" : "bg-foreground/15",
        )}
      >
        <span
          aria-hidden
          className={cn("inline-block size-5 rounded-full bg-background shadow-sm transition-transform", on ? "translate-x-[22px]" : "translate-x-0.5")}
        />
      </button>
    </div>
  );
}
