import { CalendarDays, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/** Nothing planned: a quiet note in the middle of the page, and where to look meanwhile. */
export function EventsEmpty() {
  const t = useTranslations("Events.emptyState");
  return (
    <div className="mx-auto flex max-w-sm animate-page-in flex-col items-center gap-4 py-[clamp(48px,12vh,120px)] text-center">
      <span className="grid size-12 place-items-center rounded-full border bg-card text-muted-foreground">
        <CalendarDays className="size-5" strokeWidth={1.75} aria-hidden />
      </span>
      <div className="space-y-1.5">
        <h1 className="font-narrow text-[28px] leading-none font-extrabold uppercase italic">{t("title")}</h1>
        <p className="text-sm text-pretty text-muted-foreground">{t("body")}</p>
      </div>
      <Link
        href="/matches"
        className="group inline-flex items-center gap-1.5 font-wide text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase transition-colors hover:text-foreground"
      >
        {t("cta")}
        <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" aria-hidden />
      </Link>
    </div>
  );
}
