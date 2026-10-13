import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/** Grey placeholder shape with a soft sheen (still under reduced motion). */
export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div aria-hidden className={cn("skeleton rounded-[8px]", className)} style={style} />;
}

/**
 * Wrapper of a loading placeholder: announced once to screen readers, and it fades in after a
 * short delay, so fast loads never flash grey shapes.
 */
export function SkeletonGroup({ className, children, label }: { className?: string; children: React.ReactNode; label?: string }) {
  const t = useTranslations("Common");
  return (
    <div role="status" aria-busy="true" aria-label={label ?? t("loading")} className={cn("animate-skeleton-in", className)}>
      {children}
    </div>
  );
}
