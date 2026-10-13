"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type Field = "notifyEvents" | "notifyPredictionReminders" | "notifyResults" | "notifyNews" | "hideFromLeaderboard";

/** One on/off setting, saved as soon as it is flipped (rolled back if saving fails). */
export function SettingSwitch({
  field,
  label,
  description,
  initial,
}: {
  field: Field;
  label: string;
  description: string;
  initial: boolean;
}) {
  const t = useTranslations("Settings");
  const router = useRouter();
  const [checked, setChecked] = useState(initial);
  const [pending, startTransition] = useTransition();
  const id = `switch-${field}`;

  const toggle = () => {
    const next = !checked;
    setChecked(next);
    startTransition(async () => {
      const response = await fetch("/api/v1/me/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ [field]: next }),
      });
      if (!response.ok) {
        setChecked(!next);
        toast.error(t("saveError"));
        return;
      }
      toast.success(t("saved"));
      router.refresh();
    });
  };

  return (
    <div className="flex items-start justify-between gap-6 py-4">
      <div className="min-w-0 space-y-1">
        <label htmlFor={id} className="block text-[15px] font-medium">
          {label}
        </label>
        <p className="text-sm text-pretty text-muted-foreground">{description}</p>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={pending}
        onClick={toggle}
        className={cn(
          "relative mt-0.5 inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-default",
          checked ? "bg-segment" : "bg-foreground/15",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "inline-block size-5 rounded-full bg-background shadow-sm transition-transform",
            checked ? "translate-x-[22px]" : "translate-x-0.5",
          )}
        />
      </button>
    </div>
  );
}
