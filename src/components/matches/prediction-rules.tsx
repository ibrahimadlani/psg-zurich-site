import { useTranslations } from "next-intl";
import { POINTS } from "@/lib/football/scoring";

/** "Score exact · 3 pts" etc., one rule per line. */
export function PredictionRules() {
  const t = useTranslations("Predictions");
  const rules = [
    { label: t("ruleExact"), points: POINTS.exact },
    { label: t("ruleDifference"), points: POINTS.difference },
    { label: t("ruleOutcome"), points: POINTS.outcome },
  ];
  return (
    <ul className="flex flex-col gap-1.5 text-[13px] text-muted-foreground">
      {rules.map((rule) => (
        <li key={rule.label} className="flex justify-between gap-3">
          <span>{rule.label}</span>
          <span className="text-foreground tabular-nums">{t("pts", { count: rule.points })}</span>
        </li>
      ))}
    </ul>
  );
}
