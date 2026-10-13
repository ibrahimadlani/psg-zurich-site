import { CalendarDays, MapPin, Users } from "lucide-react";
import { useTranslations } from "next-intl";

/** A made-up club event in the look of the real cards, shown blurred under the lock. */
export function EventPreview({ opponent }: { opponent?: string }) {
  const t = useTranslations("Access.preview");
  const types = useTranslations("Events.types");
  return (
    <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
      <div className="min-w-0 space-y-2">
        <span className="inline-flex h-5 items-center rounded-full bg-secondary px-2 text-xs font-medium">{types("watch_party")}</span>
        <p className="text-base font-semibold">{opponent ? t("titleMatch", { opponent }) : t("title")}</p>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <CalendarDays className="size-3.5" aria-hidden />
          {t("when")}
        </p>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="size-3.5" aria-hidden />
          {t("where")}
        </p>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Users className="size-3.5" aria-hidden />
          {t("places")}
        </p>
      </div>
      <span className="inline-flex h-8 shrink-0 items-center self-start rounded-lg bg-segment px-3 text-sm font-medium text-segment-foreground">
        {t("signUp")}
      </span>
    </div>
  );
}
