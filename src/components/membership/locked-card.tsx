import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { EventAccess } from "@/lib/dues";
import { signInHref, withReturn } from "@/lib/return-to";
import { cn } from "@/lib/utils";

const primary =
  "inline-flex h-10 items-center justify-center rounded-[8px] bg-segment px-5 font-wide text-[11px] font-semibold tracking-[0.06em] text-segment-foreground uppercase shadow-brand transition-opacity hover:opacity-90";

/**
 * A feature shown but locked: a believable preview (blurred, inert) under a short message
 * and the next step for this visitor — join, wait for the committee, or pay the fee.
 */
export function LockedCard({
  access,
  feature,
  next,
  preview,
  className,
}: {
  /** Never "full": full members get the real thing. */
  access: Exclude<EventAccess, "full">;
  feature: "predictions" | "events";
  /** Page to come back to after signing in (or joining). */
  next: string;
  preview: React.ReactNode;
  className?: string;
}) {
  const t = useTranslations("Access");
  const title = access === "guest" ? t("guestTitle") : access === "pending" ? t("pendingTitle") : t("unpaidTitle");
  const body = access === "guest" ? t(`guest.${feature}`) : access === "pending" ? t("pendingBody") : t("unpaidBody");

  return (
    // Preview and message share one grid cell: the card takes the height of the taller one.
    <div className={cn("isolate grid overflow-hidden rounded-[14px] border bg-card shadow-brand", className)}>
      <div aria-hidden inert className="pointer-events-none [grid-area:1/1] blur-[3px] saturate-50 select-none">
        {preview}
      </div>
      <div className="flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-card/55 via-card/80 to-card/95 p-5 text-center [grid-area:1/1]">
        <span className="grid size-10 place-items-center rounded-full bg-psg-blue text-white shadow-brand">
          <Lock className="size-4" aria-hidden />
        </span>
        <div className="max-w-[18rem] space-y-1">
          <p className="font-wide text-[11px] font-semibold tracking-[0.08em] uppercase">{title}</p>
          <p className="text-[13px] leading-normal text-pretty text-muted-foreground">{body}</p>
        </div>
        {access === "guest" ? (
          <div className="flex flex-col items-center gap-2">
            <Link href={withReturn("/join", next)} prefetch={false} className={primary}>
              {t("join")}
            </Link>
            <p className="text-[12px] text-muted-foreground">
              {t.rich("signIn", {
                link: (chunks) => (
                  <Link
                    href={signInHref(next)}
                    prefetch={false}
                    className="border-b pb-0.5 text-foreground transition-colors hover:border-brand-red"
                  >
                    {chunks}
                  </Link>
                ),
              })}
            </p>
          </div>
        ) : access === "unpaid" ? (
          <Link href="/dues" prefetch={false} className={primary}>
            {t("pay")}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
