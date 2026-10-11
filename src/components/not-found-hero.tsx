import { ArrowLeft } from "lucide-react";

/** Oversized "404" with the message below (Claude Design "404 v2"). */
export function NotFoundHero({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex max-w-[34rem] flex-col items-center gap-3 text-center">
      <span
        aria-hidden
        className="font-narrow text-[length:clamp(110px,22vw,220px)] leading-[0.8] font-extrabold tracking-[-0.01em] italic [text-shadow:0_18px_40px_oklch(0.366_0.098_248/0.18)]"
      >
        404
      </span>
      <h1 className="mt-5 font-wide text-[14px] font-semibold tracking-[0.12em] uppercase">{title}</h1>
      {children}
    </div>
  );
}

export const backLinkClass =
  "mt-3 inline-flex items-center gap-2 border-b pb-[3px] font-wide text-[14px] tracking-[0.02em] text-foreground transition-colors hover:border-brand-red";

export function BackArrow() {
  return <ArrowLeft aria-hidden className="size-3.5 shrink-0" strokeWidth={1.75} />;
}
