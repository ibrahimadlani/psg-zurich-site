"use client";

import { Check, Gift } from "lucide-react";
import { useTranslations } from "next-intl";
import { useOptimistic, useTransition } from "react";
import { notify } from "@/lib/notify";
import { adminButton } from "@/components/admin/ui/styles";
import { useRouter } from "@/i18n/navigation";

/** "Prize handed over" for one podium member; a toast offers to undo it. */
export function RewardToggle({ season, memberId, given }: { season: number; memberId: string; given: boolean }) {
  const t = useTranslations("AdminMatches");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [shown, setShown] = useOptimistic(given);

  const save = (next: boolean) =>
    startTransition(async () => {
      setShown(next);
      const response = await fetch("/api/v1/admin/prediction-rewards", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ season, memberId, given: next }),
      });
      if (!response.ok) return void notify.error(t("rewardError"));
      if (next) notify.undo(t("rewardSaved"), { label: t("unmark"), onUndo: () => save(false) });
      else notify.info(t("rewardUndone"));
      router.refresh();
    });

  return shown ? (
    <button type="button" disabled={pending} onClick={() => save(false)} title={t("unmark")} className={adminButton("ghost", "sm", "text-ok")}>
      <Check aria-hidden />
      {t("rewardGiven")}
    </button>
  ) : (
    <button type="button" disabled={pending} onClick={() => save(true)} className={adminButton("secondary", "sm")}>
      <Gift aria-hidden />
      {t("markGiven")}
    </button>
  );
}
