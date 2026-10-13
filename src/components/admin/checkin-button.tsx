"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";

/** "Let in" on the scan page: marks the member present at this event. */
export function CheckInButton({ eventId, token, name }: { eventId: string; token: string; name: string }) {
  const t = useTranslations("Scan");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      size="lg"
      disabled={pending}
      className="h-11 w-full sm:w-auto"
      onClick={() =>
        startTransition(async () => {
          const response = await fetch(`/api/v1/events/${eventId}/checkin`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ token }),
          });
          if (!response.ok) {
            toast.error(t("error"));
            return;
          }
          toast.success(t("checkedIn", { name }));
          router.refresh();
        })
      }
    >
      <Check aria-hidden />
      {t("checkIn")}
    </Button>
  );
}
