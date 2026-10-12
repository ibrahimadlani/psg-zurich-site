"use client";

import { Minus, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { FormMessage } from "@/components/auth/auth-ui";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  const t = useTranslations("Predictions");
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="max-w-[10rem] truncate text-center text-sm font-medium">{label}</span>
      <div className="flex items-center gap-2">
        <Button type="button" size="icon-sm" variant="outline" aria-label={t("less", { team: label })} disabled={value <= 0} onClick={() => onChange(value - 1)}>
          <Minus aria-hidden />
        </Button>
        <output aria-live="polite" className="w-10 text-center font-narrow text-4xl leading-none font-extrabold tabular-nums italic">
          {value}
        </output>
        <Button type="button" size="icon-sm" variant="outline" aria-label={t("more", { team: label })} disabled={value >= 20} onClick={() => onChange(value + 1)}>
          <Plus aria-hidden />
        </Button>
      </div>
    </div>
  );
}

/** Score prediction (90 minutes), editable until kick-off. Teams in scoreboard order. */
export function PredictionForm({
  matchId,
  psgHome,
  opponent,
  initial,
}: {
  matchId: string;
  psgHome: boolean;
  opponent: string;
  initial: { psgScore: number; opponentScore: number } | null;
}) {
  const t = useTranslations("Predictions");
  const router = useRouter();
  const [psg, setPsg] = useState(initial?.psgScore ?? 0);
  const [other, setOther] = useState(initial?.opponentScore ?? 0);
  const [message, setMessage] = useState<"saved" | "closed" | "error" | null>(null);
  const [pending, startTransition] = useTransition();

  const save = () =>
    startTransition(async () => {
      setMessage(null);
      const response = await fetch(`/api/v1/matches/${matchId}/prediction`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ psgScore: psg, opponentScore: other }),
      });
      setMessage(response.ok ? "saved" : response.status === 409 ? "closed" : "error");
      if (response.ok) router.refresh();
    });

  const psgStepper = <Stepper key="psg" label="PSG" value={psg} onChange={setPsg} />;
  const otherStepper = <Stepper key="other" label={opponent} value={other} onChange={setOther} />;

  return (
    <div className="space-y-4">
      {message ? <FormMessage tone={message === "saved" ? "success" : "error"}>{t(message)}</FormMessage> : null}
      <div className="flex items-center justify-center gap-6 sm:gap-10">
        {psgHome ? [psgStepper, otherStepper] : [otherStepper, psgStepper]}
      </div>
      <div className="flex flex-col items-center gap-1.5">
        <Button onClick={save} disabled={pending}>
          {initial ? t("update") : t("submit")}
        </Button>
        <p className="text-xs text-muted-foreground">{t("rules")}</p>
      </div>
    </div>
  );
}
