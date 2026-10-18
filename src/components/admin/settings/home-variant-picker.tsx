"use client";

import { Check, ExternalLink } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { notify } from "@/lib/notify";
import { adminButton, adminLabel } from "@/components/admin/ui/styles";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type Visitor = "coming_soon" | "landing";
type Member = "dashboard" | "feed" | "matchday";

/** A tiny drawing of each layout (blocks only), so the choice is seen before it is read. */
function Sketch({ variant }: { variant: `v-${Visitor}` | `m-${Member}` }) {
  const block = "rounded-[3px] bg-foreground/15";
  const accent = "rounded-[3px] bg-psg-blue/60 dark:bg-white/50";
  const red = "rounded-[3px] bg-psg-red/70";
  const frame = "grid h-24 gap-1 rounded-[8px] border bg-background p-2";
  switch (variant) {
    case "v-coming_soon":
      return (
        <div className={cn(frame, "place-items-center")}>
          <div className="flex w-2/3 flex-col items-center gap-1.5">
            <span className={cn(block, "h-1.5 w-1/3")} />
            <span className={cn(accent, "h-4 w-full")} />
            <span className={cn(block, "h-1.5 w-2/3")} />
          </div>
        </div>
      );
    case "v-landing":
      return (
        <div className={cn(frame, "grid-rows-[1.4fr_auto_1fr]")}>
          <div className="grid grid-cols-[3fr_2fr] items-end gap-1 rounded-[3px] bg-psg-blue/60 p-1 dark:bg-white/25">
            <div className="flex flex-col gap-1">
              <span className="h-1.5 w-3/4 rounded-[2px] bg-white/80" />
              <span className="h-1.5 w-1/2 rounded-[2px] bg-white/50" />
            </div>
            <span className="h-4 rounded-t-[3px] bg-white/30" />
          </div>
          <span className={cn(red, "h-1.5 -rotate-2")} />
          <div className="grid grid-cols-3 gap-1">
            <span className={cn(block)} />
            <span className={cn(block)} />
            <span className={cn(block)} />
          </div>
        </div>
      );
    case "m-dashboard":
      return (
        <div className={cn(frame, "grid-cols-[3fr_2fr] grid-rows-[auto_1fr_1fr]")}>
          <span className={cn(block, "col-span-2 h-2 w-1/2")} />
          <span className={cn(accent)} />
          <span className={cn(red)} />
          <span className={cn(block)} />
          <span className={cn(block)} />
        </div>
      );
    case "m-feed":
      return (
        <div className={cn(frame, "mx-auto w-2/3 grid-rows-[auto_auto_1fr]")}>
          <span className={cn(block, "h-2 w-1/2")} />
          <span className={cn(red, "h-3")} />
          <div className="grid grid-rows-3 gap-1">
            <span className={cn(block)} />
            <span className={cn(block)} />
            <span className={cn(block)} />
          </div>
        </div>
      );
    case "m-matchday":
      return (
        <div className={cn(frame, "grid-rows-[1fr_auto_auto]")}>
          <span className={cn(accent)} />
          <div className="grid grid-cols-2 gap-1">
            <span className={cn(red, "h-3")} />
            <span className={cn(block, "h-3")} />
          </div>
          <span className={cn(block, "h-3")} />
        </div>
      );
  }
}

function Option({ selected, onSelect, title, body, preview, sketch }: { selected: boolean; onSelect: () => void; title: string; body: string; preview: string; sketch: React.ReactNode }) {
  const t = useTranslations("AdminHomeVariants");
  return (
    <li
      className={cn(
        "relative flex flex-col gap-3 rounded-[14px] border bg-card p-3 transition-[border-color,box-shadow]",
        selected ? "border-psg-blue shadow-[0_0_0_3px_oklch(0.366_0.098_248/0.15)] dark:border-white" : "hover:border-foreground/25",
      )}
    >
      <button type="button" aria-pressed={selected} onClick={onSelect} className="flex cursor-pointer flex-col gap-3 text-left">
        {sketch}
        <span className="space-y-1 px-0.5">
          <span className="flex items-center gap-2 text-[14px] font-semibold">
            {title}
            {selected ? (
              <span className="grid size-4 place-items-center rounded-full bg-psg-blue text-white dark:bg-white dark:text-psg-blue">
                <Check className="size-3" aria-hidden />
              </span>
            ) : null}
          </span>
          <span className="block text-[12px] leading-snug text-pretty text-muted-foreground">{body}</span>
        </span>
      </button>
      <a href={preview} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 self-start px-0.5 text-[12px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
        <ExternalLink className="size-3" aria-hidden />
        {t("preview")}
      </a>
    </li>
  );
}

/**
 * The home page the site shows: one choice for visitors (the waiting page included), one for
 * signed-in members; each with a sketch and a preview link.
 */
export function HomeVariantPicker({ initial }: { initial: { visitor: Visitor; member: Member } }) {
  const t = useTranslations("AdminHomeVariants");
  const locale = useLocale();
  const router = useRouter();
  const [visitor, setVisitor] = useState(initial.visitor);
  const [member, setMember] = useState(initial.member);
  const [pending, startTransition] = useTransition();
  const changed = visitor !== initial.visitor || member !== initial.member;

  function save() {
    startTransition(async () => {
      const response = await fetch("/api/v1/admin/site-settings", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ visitor, member }) });
      if (!response.ok) {
        notify.error(t("error"));
        return;
      }
      notify.success(t("saved"));
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-2.5">
        <p className={adminLabel}>{t("visitors")}</p>
        <ul className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {(["coming_soon", "landing"] as const).map((value) => (
            <Option
              key={value}
              selected={visitor === value}
              onSelect={() => setVisitor(value)}
              title={t(`visitor.${value}.title`)}
              body={t(`visitor.${value}.body`)}
              preview={`/${locale}?vue=visiteur&variante=${value}`}
              sketch={<Sketch variant={`v-${value}`} />}
            />
          ))}
        </ul>
      </div>
      <div className="space-y-2.5">
        <p className={adminLabel}>{t("members")}</p>
        <ul className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {(["dashboard", "feed", "matchday"] as const).map((value) => (
            <Option
              key={value}
              selected={member === value}
              onSelect={() => setMember(value)}
              title={t(`member.${value}.title`)}
              body={t(`member.${value}.body`)}
              preview={`/${locale}?variante=${value}`}
              sketch={<Sketch variant={`m-${value}`} />}
            />
          ))}
        </ul>
      </div>
      <button type="button" disabled={!changed || pending} onClick={save} className={adminButton("primary", "md", "self-start")}>
        {t("save")}
      </button>
    </div>
  );
}
