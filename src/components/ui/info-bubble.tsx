import { Info } from "lucide-react";

/**
 * Small "i" that opens a discreet bubble on hover, or on tap/focus (phones, keyboard).
 * CSS only: the bubble shows while the button is hovered or has focus.
 */
export function InfoBubble({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="group/info relative inline-flex">
      <button
        type="button"
        aria-label={label}
        className="grid size-6 cursor-help place-items-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
      >
        <Info className="size-3.5" aria-hidden />
      </button>
      <div
        role="tooltip"
        className="invisible absolute top-full right-0 z-30 mt-2 w-[min(17rem,calc(100vw-2rem))] translate-y-1 rounded-[12px] border bg-popover p-3.5 text-left text-popover-foreground opacity-0 shadow-lg transition-[opacity,translate,visibility] duration-150 group-focus-within/info:visible group-focus-within/info:translate-y-0 group-focus-within/info:opacity-100 group-hover/info:visible group-hover/info:translate-y-0 group-hover/info:opacity-100 motion-reduce:transition-none"
      >
        {children}
      </div>
    </div>
  );
}
