"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";

/**
 * Re-reads the session on every navigation. The browser's copy can lag behind the server
 * (sign-in in another tab, email confirmation link, expired session): the header would then
 * show the wrong state while the proxy redirects according to the real one.
 */
export function SessionSync() {
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false; // useSession already fetches on mount
      return;
    }
    authClient.$store.notify("$sessionSignal");
  }, [pathname]);

  return null;
}
