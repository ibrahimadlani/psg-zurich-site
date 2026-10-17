"use client";

import { useSyncExternalStore } from "react";

// Asked once per page load, shared by the menu and the bag.
let open: boolean | null = null;
let asking: Promise<void> | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  asking ??= fetch("/api/v1/shop/status", { cache: "no-store" })
    .then((response) => (response.ok ? (response.json() as Promise<{ data: { open: boolean } }>) : null))
    .then((body) => {
      open = body?.data.open ?? false;
      listeners.forEach((notify) => notify());
    })
    .catch(() => {
      asking = null;
    });
  return () => listeners.delete(listener);
}

/** Whether the shop is open (false until known: the link appears, never disappears). */
export const useShopOpen = () => useSyncExternalStore(subscribe, () => open === true, () => false);
