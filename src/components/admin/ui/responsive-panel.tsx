"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const DESKTOP = "(min-width: 64rem)";
const subscribe = (listener: () => void) => {
  const query = window.matchMedia(DESKTOP);
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
};

/** True from the lg breakpoint (computer), false on phones and tablets (and on the server). */
export function useIsDesktop() {
  return useSyncExternalStore(subscribe, () => window.matchMedia(DESKTOP).matches, () => false);
}

/**
 * Where every admin form opens: a panel on the right on a computer, a sheet rising from the
 * bottom on a phone (almost full height). Title on top, the form scrolls, actions stay in reach.
 */
export function ResponsivePanel({
  open,
  onOpenChange,
  title,
  description,
  footer,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** Actions pinned at the bottom (save, cancel). */
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const t = useTranslations("AdminShell");
  const desktop = useIsDesktop();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={desktop ? "right" : "bottom"}
        showCloseButton={false}
        className={cn(
          "gap-0 bg-background p-0",
          desktop ? "w-full data-[side=right]:sm:max-w-[30rem]" : "max-h-[92svh] rounded-t-[18px]",
          className,
        )}
      >
        {desktop ? null : <span aria-hidden className="mx-auto mt-3 block h-1 w-10 shrink-0 rounded-full bg-foreground/15" />}
        <div className="flex items-start gap-3 border-b px-5 pt-4 pb-4 lg:pt-6">
          <div className="min-w-0 flex-1 space-y-1">
            <SheetTitle className="font-narrow text-[28px] leading-none font-extrabold uppercase italic">{title}</SheetTitle>
            {description ? (
              <SheetDescription className="text-sm text-muted-foreground">{description}</SheetDescription>
            ) : (
              <SheetDescription className="sr-only">{title}</SheetDescription>
            )}
          </div>
          <SheetClose className="-mt-1 -mr-2 grid size-10 shrink-0 cursor-pointer place-items-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground">
            <X className="size-5" aria-hidden />
            <span className="sr-only">{t("close")}</span>
          </SheetClose>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer ? (
          <div className="flex flex-col-reverse gap-2 border-t bg-background px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end">
            {footer}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
