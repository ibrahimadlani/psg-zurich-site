"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { useSession } from "@/lib/auth-client";

/**
 * Visitor-only pages (sign-in, forgot password, sign-up). The proxy redirects signed-in
 * members on a real request, but client navigations can be served from the router cache
 * (pages prefetched while still a guest): send members home from here too.
 */
export function GuestOnly({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data } = useSession();
  const signedIn = Boolean(data);

  useEffect(() => {
    if (signedIn) router.replace("/");
  }, [signedIn, router]);

  return signedIn ? null : children;
}
