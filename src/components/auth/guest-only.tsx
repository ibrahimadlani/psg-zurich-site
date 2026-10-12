"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { authClient, useSession } from "@/lib/auth-client";

/**
 * Visitor-only pages (sign-in, forgot password, sign-up). The proxy redirects signed-in
 * members on a real request, but client navigations can be served from the router cache
 * (pages prefetched while still a guest): send members home from here too — after asking
 * the server, since the browser's copy of the session may be stale.
 */
export function GuestOnly({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data } = useSession();
  const [confirmedGuest, setConfirmedGuest] = useState(false);

  useEffect(() => {
    let active = true;
    authClient.getSession().then(({ data: fresh }) => {
      if (!active) return;
      if (fresh) router.replace("/");
      else setConfirmedGuest(true);
    });
    return () => {
      active = false;
      // Kept in the router cache (Activity): check again next time the page shows.
      setConfirmedGuest(false);
    };
  }, [router]);

  // Hidden while a (possibly stale) session says "signed in" and the server hasn't answered.
  // (Signing in on the page itself: the login form navigates home.)
  if (data && !confirmedGuest) return null;
  return children;
}
