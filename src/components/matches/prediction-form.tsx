"use client";

import { Minus, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const stepButton =
  "inline-flex size-9 cursor-pointer items-center justify-center rounded-full border text-foreground transition-[background-color,transform] hover:bg-foreground/5 active:scale-[0.92] disabled:cursor-default disabled:opacity-40 [&_svg]:size-3.5";

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  const t = useTranslations("Predictions");
  return (
    <div className="flex flex-col items-center gap-3">
      <span className="max-w-full truncate text-sm">{label}</span>
      <output aria-live="polite" className="font-narrow text-[64px] leading-[0.9] font-extrabold tabular-nums italic">
        {value}
      </output>
      <div className="flex gap-1.5">
        <button type="button" className={stepButton} aria-label={t("less", { team: label })} disabled={value <= 0} onClick={() => onChange(value - 1)}>
          <Minus aria-hidden />
        </button>
        <button type="button" className={stepButton} aria-label={t("more", { team: label })} disabled={value >= 20} onClick={() => onChange(value + 1)}>
          <Plus aria-hidden />
        </button>
      </div>
    </div>
  );
}

/**
 * Open prediction (until kick-off): title with a "Saved" mark, hint, the two scores in
 * scoreboard order, then a button that reads "Save", "Update" or "Saved".
 */
export function PredictionForm({
  matchId,
  psgHome,
  opponent,
  initial,
  rules,
}: {
  matchId: string;
  psgHome: boolean;
  opponent: string;
  initial: { psgScore: number; opponentScore: number } | null;
  rules: React.ReactNode;
}) {
  const t = useTranslations("Predictions");
  const router = useRouter();
  const [psg, setPsg] = useState(initial?.psgScore ?? 0);
  const [other, setOther] = useState(initial?.opponentScore ?? 0);
  const [saved, setSaved] = useState(initial);
  const [failure, setFailure] = useState<"closed" | "error" | null>(null);
  const [pending, startTransition] = useTransition();
  const isSaved = saved !== null && saved.psgScore === psg && saved.opponentScore === other;

  const save = () =>
    startTransition(async () => {
      setFailure(null);
      const response = await fetch(`/api/v1/matches/${matchId}/prediction`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ psgScore: psg, opponentScore: other }),
      });
      if (!response.ok) {
        setFailure(response.status === 409 ? "closed" : "error");
        return;
      }
      setSaved({ psgScore: psg, opponentScore: other });
      router.refresh();
    });

  const psgStepper = <Stepper key="psg" label="PSG" value={psg} onChange={setPsg} />;
  const otherStepper = <Stepper key="other" label={opponent} value={other} onChange={setOther} />;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-wide text-xs font-semibold tracking-[0.08em] uppercase">{t("title")}</h2>
          {isSaved ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <span aria-hidden className="size-1.5 rounded-full bg-ok" />
              {t("savedBadge")}
            </span>
          ) : null}
        </div>
        <p className="text-sm leading-normal text-pretty text-muted-foreground">{t("openHint")}</p>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start gap-2 border-y py-5">
        {psgHome ? [psgStepper, otherStepper] : [otherStepper, psgStepper]}
      </div>

      {failure ? (
        <p role="alert" className="text-sm text-destructive">
          {t(failure)}
        </p>
      ) : null}
      <button
        type="button"
        onClick={save}
        disabled={pending || isSaved}
        className={cn(
          "h-11 rounded-[8px] font-wide text-[11px] font-semibold tracking-[0.06em] uppercase transition-[opacity,transform]",
          isSaved
            ? "cursor-default border text-muted-foreground"
            : "cursor-pointer bg-segment text-segment-foreground shadow-brand hover:opacity-90 active:scale-[0.98] disabled:opacity-60",
        )}
      >
        {isSaved ? t("savedButton") : saved ? t("update") : t("saveButton")}
      </button>
      {rules}
    </div>
  );
}
