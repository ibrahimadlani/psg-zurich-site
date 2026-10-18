"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { send } from "@/lib/analytics/client";

/**
 * Counts each page seen (lib/analytics): on arrival — with where the visitor came from and the
 * campaign (?utm_source=) — then on every move within the site.
 */
export function PageViewTracker() {
  const pathname = usePathname();
  const first = useRef(true);
  const last = useRef<string | null>(null);

  useEffect(() => {
    // Once per page (React may run this twice for the same page in development).
    if (last.current === window.location.pathname) return;
    last.current = window.location.pathname;
    const entry = first.current;
    first.current = false;
    const params = new URLSearchParams(window.location.search);
    send({
      type: "view",
      path: window.location.pathname,
      referrer: entry ? document.referrer || undefined : undefined,
      utm: entry ? params.get("utm_source") || undefined : undefined,
      entry,
    });
  }, [pathname]);

  return null;
}
