"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";

type Props = { id: string; status: "pending" | "rejected"; emailVerified: boolean };

/** Accept / Refuse buttons of a membership request. */
export function MemberDecisionActions({ id, status, emailVerified }: Props) {
  const t = useTranslations("AdminMembers");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const decide = (decision: "approve" | "reject") =>
    startTransition(async () => {
      const response = await fetch(`/api/v1/members/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      if (!response.ok) toast.error(t("error"));
      else toast.success(t(decision === "approve" ? "approved" : "rejected"));
      router.refresh();
    });

  return (
    <div className="flex shrink-0 gap-2">
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
  );
}
