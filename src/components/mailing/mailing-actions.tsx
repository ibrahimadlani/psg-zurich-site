"use client";

import { Mail, Play } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useConfirm } from "@/components/admin/ui/confirm-dialog";
import { adminButton } from "@/components/admin/ui/styles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const send = (url: string, method: string, body?: object) =>
  fetch(url, { method, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });

/**
 * "New campaign": asks for an internal name, then opens its editor. From an event or the fees
 * page, the audience comes already chosen (its sign-ups, the members who still owe the fee).
 */
export function NewCampaignButton({
  audience,
  eventId,
  defaultName,
  label,
  className,
}: {
  audience?: "unpaid" | "event";
  eventId?: string;
  defaultName?: string;
  label?: string;
  className?: string;
}) {
  const t = useTranslations("Mailing");
  const router = useRouter();
  const ask = useConfirm();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className={className ?? adminButton("primary")}
      onClick={async () => {
        const name = (
          await ask({
            title: t("campaigns.new"),
            confirmLabel: t("campaigns.create"),
            input: { label: t("campaigns.namePrompt"), placeholder: defaultName, required: !defaultName },
          })
        )?.trim();
        if (name === undefined) return;
        startTransition(async () => {
          const response = await send("/api/v1/mailing/campaigns", "POST", { name: name || defaultName, audience, audienceEventId: eventId });
          if (!response.ok) return void toast.error(t("error"));
          const { data } = (await response.json()) as { data: { id: string } };
          router.push(`/admin/mailing/campaigns/${data.id}`);
        });
      }}
    >
      <Mail aria-hidden />
      {label ?? t("campaigns.new")}
    </button>
  );
}

/** Retry (failed / skipped) or cancel (waiting) one email of the log. */
export function JobActions({ id, status }: { id: string; status: string }) {
  const t = useTranslations("Mailing");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const action = status === "pending" ? "cancel" : ["failed", "skipped", "cancelled"].includes(status) ? "retry" : null;
  if (!action) return null;
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const response = await send(`/api/v1/mailing/jobs/${id}`, "PATCH", { action });
          if (!response.ok) return void toast.error(t("error"));
          toast.success(t("journal.done"));
          router.refresh();
        })
      }
    >
      {t(`journal.${action}`)}
    </Button>
  );
}

/** Pause switch, pace, and "run now". */
export function MailingSettingsForm({ paused, dailyCap, perMinute }: { paused: boolean; dailyCap: number; perMinute: number }) {
  const t = useTranslations("Mailing");
  const router = useRouter();
  const [on, setOn] = useState(paused);
  const [pending, startTransition] = useTransition();
  const save = (body: object, rollback?: () => void) =>
    startTransition(async () => {
      const response = await send("/api/v1/mailing/settings", "PATCH", body);
      if (!response.ok) {
        rollback?.();
        return void toast.error(t("error"));
      }
      toast.success(t("saved"));
      router.refresh();
    });
  const number = (name: "dailyCap" | "perMinute", value: number) => (
    <div className="space-y-1.5">
      <Label htmlFor={`mailing-${name}`}>{t(`settings.${name}`)}</Label>
      <Input
        id={`mailing-${name}`}
        type="number"
        min={1}
        defaultValue={value}
        className="w-32"
        onBlur={(event) => {
          const next = Number(event.target.value);
          if (Number.isInteger(next) && next > 0 && next !== value) save({ [name]: next });
        }}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-6">
        <div className="space-y-1">
          <p className="text-[15px] font-medium">{t("settings.paused")}</p>
          <p className="text-sm text-muted-foreground">{t("settings.pausedHint")}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label={t("settings.paused")}
          disabled={pending}
          onClick={() => {
            const next = !on;
            setOn(next);
            save({ paused: next }, () => setOn(!next));
          }}
          className={cn("relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors", on ? "bg-psg-red" : "bg-foreground/15")}
        >
          <span aria-hidden className={cn("inline-block size-5 rounded-full bg-background shadow-sm transition-transform", on ? "translate-x-[22px]" : "translate-x-0.5")} />
        </button>
      </div>
      <div className="flex flex-wrap gap-6">
        {number("dailyCap", dailyCap)}
        {number("perMinute", perMinute)}
      </div>
      <div className="space-y-2 border-t pt-5">
        <Button
          variant="outline"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const response = await send("/api/v1/mailing/run", "POST");
              if (!response.ok) return void toast.error(t("error"));
              toast.success(t("settings.runDone"));
              router.refresh();
            })
          }
        >
          <Play aria-hidden />
          {t("settings.run")}
        </Button>
        <p className="text-xs text-muted-foreground">{t("settings.runHint")}</p>
      </div>
    </div>
  );
}
