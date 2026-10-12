"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";

type Props = { id: string; status: "pending" | "rejected"; emailVerified: boolean };

/** Accept / Refuse buttons of a membership request. */
export function MemberDecisionActions({ id, status, emailVerified }: Props) {
  const t = useTranslations("AdminMembers");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  const decide = (decision: "approve" | "reject") =>
    startTransition(async () => {
      setFailed(false);
      const response = await fetch(`/api/v1/members/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      if (!response.ok) setFailed(true);
      router.refresh();
    });

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={pending || !emailVerified}
          title={emailVerified ? undefined : t("unverifiedHint")}
          onClick={() => decide("approve")}
        >
          {t("approve")}
        </Button>
        {status === "pending" ? (
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => {
              if (confirm(t("confirmReject"))) decide("reject");
            }}
          >
            {t("reject")}
          </Button>
        ) : null}
      </div>
      {failed ? <span className="text-xs text-destructive">{t("error")}</span> : null}
    </div>
  );
}
