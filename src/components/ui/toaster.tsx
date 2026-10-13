"use client";

import { CircleAlert, CircleCheck, Info, LoaderCircle } from "lucide-react";
import { useSyncExternalStore } from "react";
import { Toaster as Sonner } from "sonner";

const PHONE = "(max-width: 639px)";
function subscribePhone(onChange: () => void) {
  const query = matchMedia(PHONE);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
const isPhone = () => matchMedia(PHONE).matches;

/*
 * The site's single toast area (mounted once in the locale layout). Every form reports its
 * outcome with sonner's `toast.success / toast.error / toast.info`: same look everywhere, in
 * the site's colours, light and dark alike (the classes use the theme tokens).
 *
 * Phones: at the top, below the notch, where the on-screen keyboard (forms!) never hides them;
 * swiped up to dismiss. Larger screens: bottom centre.
 */
export function Toaster() {
  const phone = useSyncExternalStore(subscribePhone, isPhone, () => false);
  return (
    <Sonner
      position={phone ? "top-center" : "bottom-center"}
      swipeDirections={phone ? ["top"] : ["bottom", "left", "right"]}
      visibleToasts={3}
      gap={8}
      offset={20}
      mobileOffset={{ top: "calc(12px + env(safe-area-inset-top))", left: 12, right: 12 }}
      toastOptions={{
        unstyled: true,
        duration: 4000,
        classNames: {
          toast:
            "group pointer-events-auto flex w-full items-start gap-3 rounded-[12px] border bg-card px-4 py-3 text-[14px] leading-snug text-card-foreground shadow-brand sm:w-[380px]",
          icon: "mt-px flex size-[18px] shrink-0 items-center justify-center [&>svg]:size-[18px]",
          content: "min-w-0 flex-1 space-y-0.5",
          title: "font-semibold",
          description: "text-[13px] text-muted-foreground",
          // At least 32px high: easy to hit with a thumb.
          actionButton:
            "-my-1 ml-2 inline-flex min-h-8 shrink-0 cursor-pointer items-center rounded-md px-2.5 text-[13px] font-semibold text-foreground hover:bg-foreground/5",
          closeButton: "hidden",
          success: "[&_[data-icon]]:text-ok",
          error: "border-destructive/40 [&_[data-icon]]:text-destructive",
          info: "[&_[data-icon]]:text-psg-blue dark:[&_[data-icon]]:text-foreground",
        },
      }}
      icons={{
        success: <CircleCheck aria-hidden strokeWidth={2} />,
        error: <CircleAlert aria-hidden strokeWidth={2} />,
        info: <Info aria-hidden strokeWidth={2} />,
        loading: <LoaderCircle aria-hidden className="animate-spin" strokeWidth={2} />,
      }}
    />
  );
}
