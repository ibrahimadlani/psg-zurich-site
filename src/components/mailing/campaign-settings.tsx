"use client";

import { Send } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { useConfirm } from "@/components/admin/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "@/i18n/navigation";

const AUDIENCES = ["members", "paid", "unpaid", "pending", "event"] as const;
type Audience = (typeof AUDIENCES)[number];

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

/** Audience, button link, live recipient count, then send now, schedule, or delete. */
export function CampaignSettings({
  campaign,
  events,
}: {
  campaign: {
    id: string;
    name: string;
    audience: Audience;
    audienceEventId: string | null;
    ctaUrl: string | null;
    status: "draft" | "scheduled" | "sending" | "sent";
    scheduledAt: string | null;
  };
  events: { id: string; label: string }[];
}) {
  const t = useTranslations("Mailing");
  const format = useFormatter();
  const router = useRouter();
  const ask = useConfirm();
  const [name, setName] = useState(campaign.name);
  const [audience, setAudience] = useState<Audience>(campaign.audience);
  const [eventId, setEventId] = useState(campaign.audienceEventId ?? events[0]?.id ?? "");
  const [ctaUrl, setCtaUrl] = useState(campaign.ctaUrl ?? "");
  const [at, setAt] = useState("");
  const [count, setCount] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const locked = campaign.status === "sending" || campaign.status === "sent";

  // Live count of the recipients for the chosen audience.
  useEffect(() => {
    let stale = false;
    const params = new URLSearchParams({ audience, ...(audience === "event" && eventId ? { eventId } : {}) });
    fetch(`/api/v1/mailing/campaigns/${campaign.id}/audience?${params}`)
      .then((response) => (response.ok ? (response.json() as Promise<{ data: { count: number } }>) : null))
      .then((body) => {
        if (body && !stale) setCount(body.data.count);
      })
      .catch(() => {});
    return () => {
      stale = true;
    };
  }, [audience, eventId, campaign.id]);

  const call = (url: string, method: string, body?: object) =>
    fetch(url, { method, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const saveSettings = async () => {
    const response = await call(`/api/v1/mailing/campaigns/${campaign.id}`, "PATCH", {
      name,
      audience,
      audienceEventId: audience === "event" ? eventId || null : null,
      ctaUrl,
    });
    if (!response.ok) toast.error(t("error"));
    return response.ok;
  };
  const launch = (when: string | null | undefined) =>
    startTransition(async () => {
      if (!(await saveSettings())) return;
      const response = await call(`/api/v1/mailing/campaigns/${campaign.id}/send`, "POST", { at: when });
      if (!response.ok) {
        const code = ((await response.json().catch(() => null)) as { error?: { code?: string } } | null)?.error?.code;
        return void toast.error(code === "no_texts" ? t("campaigns.noTexts") : t("error"));
      }
      const { data } = (await response.json()) as { data: { queued: number } };
      toast.success(when === undefined ? t("campaigns.queued", { count: data.queued }) : when ? t("campaigns.scheduled") : t("saved"));
      router.refresh();
    });

  if (locked) return <p className="text-sm text-muted-foreground">{t("campaigns.locked")}</p>;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="campaign-name">{t("campaigns.name")}</Label>
          <Input id="campaign-name" value={name} maxLength={120} onChange={(event) => setName(event.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="campaign-audience">{t("campaigns.audience")}</Label>
          <select id="campaign-audience" className={selectClass} value={audience} onChange={(event) => setAudience(event.target.value as Audience)}>
            {AUDIENCES.map((value) => (
              <option key={value} value={value}>
                {t(`campaigns.audiences.${value}`)}
              </option>
            ))}
          </select>
        </div>
        {audience === "event" ? (
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="campaign-event">{t("campaigns.event")}</Label>
            <select id="campaign-event" className={selectClass} value={eventId} onChange={(event) => setEventId(event.target.value)}>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="campaign-cta">{t("campaigns.ctaUrl")}</Label>
          <Input id="campaign-cta" value={ctaUrl} placeholder="/evenements" maxLength={255} onChange={(event) => setCtaUrl(event.target.value)} />
          <p className="text-xs text-muted-foreground">{t("campaigns.ctaUrlHint")}</p>
        </div>
      </div>
      <p className="text-sm font-medium">{count === null ? "…" : t("campaigns.count", { count })}</p>
      {campaign.status === "scheduled" && campaign.scheduledAt ? (
        <p className="text-sm text-muted-foreground">
          {t("campaigns.scheduledFor", { date: format.dateTime(new Date(campaign.scheduledAt), { dateStyle: "full", timeStyle: "short" }) })}
        </p>
      ) : null}
      <div className="flex flex-wrap items-end gap-2">
        <Button variant="outline" disabled={pending} onClick={() => startTransition(async () => void ((await saveSettings()) && (toast.success(t("saved")), router.refresh())))}>
          {t("campaigns.saveSettings")}
        </Button>
        <Button
          disabled={pending || !count}
          onClick={async () => {
            if ((await ask({ title: t("campaigns.sendNow"), body: t("campaigns.confirmSend", { count: count ?? 0 }), confirmLabel: t("campaigns.sendNow") })) !== null) launch(undefined);
          }}
        >
          <Send aria-hidden />
          {t("campaigns.sendNow")}
        </Button>
      </div>
      <div className="flex flex-wrap items-end gap-2 border-t pt-4">
        <div className="space-y-1.5">
          <Label htmlFor="campaign-at">{t("campaigns.sendAt")}</Label>
          <Input id="campaign-at" type="datetime-local" value={at} onChange={(event) => setAt(event.target.value)} />
        </div>
        <Button variant="outline" disabled={pending || !at} onClick={() => launch(new Date(at).toISOString())}>
          {t("campaigns.schedule")}
        </Button>
        {campaign.status === "scheduled" ? (
          <Button variant="ghost" disabled={pending} onClick={() => launch(null)}>
            {t("campaigns.unschedule")}
          </Button>
        ) : null}
        <Button
          variant="ghost"
          className="ml-auto text-destructive hover:text-destructive"
          disabled={pending}
          onClick={async () => {
            if ((await ask({ title: t("campaigns.delete"), body: t("campaigns.confirmDelete"), confirmLabel: t("campaigns.delete"), tone: "danger" })) === null) return;
            startTransition(async () => {
              const response = await call(`/api/v1/mailing/campaigns/${campaign.id}`, "DELETE");
              if (!response.ok) return void toast.error(t("error"));
              router.push("/admin/mailing?onglet=campagnes");
            });
          }}
        >
          {t("campaigns.delete")}
        </Button>
      </div>
    </div>
  );
}
