"use client";

import { Settings } from "lucide-react";
import { useTranslations } from "next-intl";
import { headerIconButtonClass } from "@/components/header-icon-button";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { NotificationBell } from "@/components/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { Link } from "@/i18n/navigation";
import { useSession } from "@/lib/auth-client";

/**
 * Two small buttons left of the account menu: language and theme for visitors; for signed-in
 * members, the notification bell and a shortcut to the settings (where language and theme live).
 */
export function HeaderTools() {
  const t = useTranslations("Nav");
  const { data, isPending } = useSession();

  // Same footprint while the session loads, so nothing jumps.
  if (isPending) return <span aria-hidden className="block h-8 w-[68px]" />;
  if (!data) {
    return (
      <>
        <LocaleSwitcher />
        <ThemeToggle />
      </>
    );
  }
  return (
    <>
      <NotificationBell />
      <Link href="/parametres" prefetch={false} aria-label={t("settings")} title={t("settings")} className={headerIconButtonClass}>
        <Settings className="size-3.5" aria-hidden />
      </Link>
    </>
  );
}
