"use client";

import { Minus, Plus } from "lucide-react";
import { useNow, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
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

/** Time left before predictions close (kick-off): "2 d 4 h", then "03:12:45" on the last day. */
function Countdown({ to }: { to: string }) {
  const t = useTranslations("Predictions");
  const now = useNow({ updateInterval: 1000 });
  const left = Math.max(0, new Date(to).getTime() - now.getTime());
  if (left === 0) return <p className="-mt-2 text-center text-xs text-muted-foreground">{t("closed")}</p>;
  const total = Math.floor(left / 1000);
  const days = Math.floor(total / 86_400);
  const hours = Math.floor((total % 86_400) / 3600);
  const two = (value: number) => String(value).padStart(2, "0");
  const time = days > 0 ? t("countdownDays", { days, hours }) : `${two(hours)}:${two(Math.floor((total % 3600) / 60))}:${two(total % 60)}`;
  return (
    <p className="-mt-2 text-center text-xs text-muted-foreground tabular-nums" suppressHydrationWarning>
      {t("closesIn", { time })}
    </p>
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
  kickoffAt,
}: {
  matchId: string;
  psgHome: boolean;
  opponent: string;
  initial: { psgScore: number; opponentScore: number } | null;
  /** ISO date: the countdown under the button runs to it. */
  kickoffAt: string;
}) {
  const t = useTranslations("Predictions");
  const router = useRouter();
  const [psg, setPsg] = useState(initial?.psgScore ?? 0);
  const [other, setOther] = useState(initial?.opponentScore ?? 0);
  const [saved, setSaved] = useState(initial);
  const [pending, startTransition] = useTransition();
  const isSaved = saved !== null && saved.psgScore === psg && saved.opponentScore === other;

  const save = () =>
    startTransition(async () => {
      const response = await fetch(`/api/v1/matches/${matchId}/prediction`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ psgScore: psg, opponentScore: other }),
      });
      if (!response.ok) {
        toast.error(t(response.status === 409 ? "closed" : "error"));
        return;
      }
      setSaved({ psgScore: psg, opponentScore: other });
      toast.success(t("toastSaved", { psg, other, opponent }));
      router.refresh();
    });

  const psgStepper = <Stepper key="psg" label="PSG" value={psg} onChange={setPsg} />;
  const otherStepper = <Stepper key="other" label={opponent} value={other} onChange={setOther} />;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start gap-2 border-b pb-5">
        {psgHome ? [psgStepper, otherStepper] : [otherStepper, psgStepper]}
      </div>

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
      <Countdown to={kickoffAt} />
    </div>
  );
}

/** Static look-alike of the form (2 – 1), shown blurred under the "members only" lock. */
export function PredictionPreview({ opponent, psgHome }: { opponent: string; psgHome: boolean }) {
  const t = useTranslations("Predictions");
  const side = (label: string, value: number) => (
    <div key={label} className="flex flex-col items-center gap-3">
      <span className="max-w-full truncate text-sm">{label}</span>
      <span className="font-narrow text-[64px] leading-[0.9] font-extrabold tabular-nums italic">{value}</span>
      <div className="flex gap-1.5">
        <span className={stepButton}>
          <Minus aria-hidden />
        </span>
        <span className={stepButton}>
          <Plus aria-hidden />
        </span>
      </div>
    </div>
  );
  return (
    <div className="flex flex-col gap-5 p-6">
      <div className="grid grid-cols-2 items-start gap-2 border-b pb-5">
        {psgHome ? [side("PSG", 2), side(opponent, 1)] : [side(opponent, 1), side("PSG", 2)]}
      </div>
      <span className="grid h-11 place-items-center rounded-[8px] bg-segment font-wide text-[11px] font-semibold tracking-[0.06em] text-segment-foreground uppercase">
        {t("saveButton")}
      </span>
    </div>
  );
}
