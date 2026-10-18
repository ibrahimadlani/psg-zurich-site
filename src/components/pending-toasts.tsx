"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { notify, PENDING_KEY, type PendingToast } from "@/lib/notify";

/** A message left waiting longer than this is stale (the navigation never happened). */
const MAX_AGE_MS = 20_000;
/** At most this long waiting for the page's loading placeholders to go. */
const MAX_WAIT_MS = 8_000;
/** The page must then stay put this long: a stop that redirects at once (/welcome) is skipped. */
const SETTLE_MS = 600;

/** Calls `ready` once the page has no loading placeholder left (SkeletonGroup: aria-busy). */
function whenLoaded(ready: () => void) {
  const busy = () => document.querySelector('[aria-busy="true"]') !== null;
  if (!busy()) {
    ready();
    return () => undefined;
  }
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    observer.disconnect();
    window.clearTimeout(timer);
    ready();
  };
  const observer = new MutationObserver(() => {
    if (!busy()) finish();
  });
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-busy"] });
  const timer = window.setTimeout(finish, MAX_WAIT_MS);
  return () => {
    done = true;
    observer.disconnect();
    window.clearTimeout(timer);
  };
}

/**
 * Shows the toast left by `notify.afterNavigation` once the next page is there and loaded (its
 * placeholders gone): on every change of address (language included — the layout is then
 * mounted anew, so on mount too).
 */
export function PendingToasts() {
  const pathname = usePathname();
  const t = useTranslations();

  useEffect(() => {
    let pending: PendingToast | null = null;
    try {
      const raw = sessionStorage.getItem(PENDING_KEY);
      pending = raw ? (JSON.parse(raw) as PendingToast) : null;
    } catch {
      return;
    }
    if (!pending) return;
    const stale = Date.now() - pending.at > MAX_AGE_MS;
    // Still on the page that left it: the navigation has not landed yet.
    if (!stale && window.location.pathname === pending.from) return;
    const clear = () => {
      try {
        sessionStorage.removeItem(PENDING_KEY);
      } catch {
        // Nothing to clean.
      }
    };
    if (stale) return clear();
    const message = pending.message ?? (pending.key && t.has(pending.key as never) ? t(pending.key as never) : null);
    if (!message) return clear();
    const { kind, description } = pending;
    // Taken off the queue only when shown: a further redirect before then keeps it for the next page.
    let settle = 0;
    const stopWaiting = whenLoaded(() => {
      settle = window.setTimeout(() => {
        clear();
        notify[kind](message, { description });
      }, SETTLE_MS);
    });
    return () => {
      stopWaiting();
      window.clearTimeout(settle);
    };
  }, [pathname, t]);

  return null;
}
