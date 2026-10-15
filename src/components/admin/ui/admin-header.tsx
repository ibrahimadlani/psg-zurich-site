import { cn } from "@/lib/utils";

/**
 * Top of every admin page: the title in the site's narrow italic capitals, a line about the
 * page, and its main action(s) on the right (under the title on a phone, full width).
 */
export function AdminHeader({
  title,
  description,
  actions,
  eyebrow,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  /** Small label above the title (the page it belongs to, a date…). */
  eyebrow?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between lg:mb-8", className)}>
      <div className="min-w-0 space-y-2">
        {eyebrow ? <div className="font-wide text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">{eyebrow}</div> : null}
        <h1 className="font-narrow text-[length:clamp(34px,6vw,52px)] leading-[0.9] font-extrabold tracking-[-0.01em] text-balance uppercase italic">
          {title}
        </h1>
        {description ? <p className="max-w-prose text-[15px] text-pretty text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="grid shrink-0 gap-2 max-sm:grid-flow-row sm:flex sm:items-center">{actions}</div> : null}
    </header>
  );
}

/** Shown instead of a page the role may not open (the API refuses it as well). */
export function AdminForbidden({ message }: { message: string }) {
  return <p className="rounded-[14px] border border-dashed p-8 text-center text-sm text-muted-foreground">{message}</p>;
}
