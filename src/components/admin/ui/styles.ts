import { cn } from "@/lib/utils";

/*
 * Buttons and labels of the admin, in the site's sporty style: wide capitals, 8 px corners,
 * PSG blue for the main action. Phones get 44 px targets, computers a tighter 36 px.
 */

const base =
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-[8px] font-wide text-[10.5px] font-semibold tracking-[0.06em] whitespace-nowrap uppercase transition-[background-color,border-color,color,opacity,transform] outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-3.5 [&_svg]:shrink-0";

const sizes = { md: "h-11 px-4 lg:h-9 lg:px-3.5", sm: "h-9 px-3 lg:h-8 lg:px-2.5", icon: "size-11 lg:size-9" };

const tones = {
  primary: "bg-psg-blue text-white shadow-brand hover:opacity-90 dark:bg-white dark:text-psg-blue",
  secondary: "border bg-card hover:bg-foreground/[0.05]",
  ghost: "text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground",
  danger: "border border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/10",
  ok: "bg-emerald-600 text-white hover:opacity-90",
};

export function adminButton(tone: keyof typeof tones = "secondary", size: keyof typeof sizes = "md", className?: string) {
  return cn(base, sizes[size], tones[tone], className);
}

/** Small capitals above a group (« À FAIRE », « PROFIL »). */
export const adminLabel = "font-wide text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase";

/** A white card on the diagonal background. */
export const adminCard = "rounded-[14px] border bg-card";

/** Text fields: 16 px on phones (no iOS zoom), 44 px tall on phones. */
export const adminInput =
  "h-11 w-full min-w-0 rounded-[8px] border border-input bg-background px-3 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive lg:h-9 lg:text-sm dark:bg-input/30";
