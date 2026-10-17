"use client";

import { LocaleSwitcher } from "@/components/locale-switcher";
import { NotificationBell } from "@/components/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { useSession } from "@/lib/auth-client";

/**
 * Small buttons left of the account menu: language and theme for visitors; for signed-in members,
 * the notification bell (settings are in the account menu).
 */
export function HeaderTools() {
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
  return <NotificationBell />;
}
