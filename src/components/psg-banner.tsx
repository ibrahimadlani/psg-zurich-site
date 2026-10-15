import { cn } from "@/lib/utils";

/**
 * The band of the Hechter shirt — blue, white, red, white, blue — used to mark PSG or the
 * current page. Size it with `className` (keep roughly 1 : 2.8, e.g. w-2.5 h-7 or 7 × 20 px).
 */
export function PsgBanner({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <span
      aria-hidden
      style={style}
      className={cn(
        "block rounded-[2px]",
        "[background:linear-gradient(90deg,var(--color-psg-blue)_0_26%,#fff_26%_36%,var(--color-psg-red)_36%_64%,#fff_64%_74%,var(--color-psg-blue)_74%)]",
        // A hairline keeps the white stripes and blue edges visible on both themes.
        "shadow-[0_0_0_0.5px_rgb(0_0_0/0.12)] dark:shadow-[0_0_0_0.5px_rgb(255_255_255/0.35)]",
        className,
      )}
    />
  );
}
