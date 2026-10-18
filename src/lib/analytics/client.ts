"use client";

/*
 * Sending to the audience beacon (/api/v1/analytics) from the browser: never blocks, never
 * fails visibly. Nothing is sent from the admin, nor for visitors who asked not to be tracked.
 */

const ENDPOINT = "/api/v1/analytics";

function optedOut() {
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  return nav.doNotTrack === "1" || nav.globalPrivacyControl === true || window.location.pathname.includes("/admin");
}

export function send(payload: Record<string, unknown>) {
  if (typeof window === "undefined" || optedOut()) return;
  const data = JSON.stringify(payload);
  // sendBeacon survives the page being left (a click on a card that navigates away).
  if (navigator.sendBeacon?.(ENDPOINT, new Blob([data], { type: "application/json" }))) return;
  void fetch(ENDPOINT, { method: "POST", body: data, headers: { "content-type": "application/json" }, keepalive: true }).catch(() => undefined);
}

/** A click worth counting, e.g. track("event_card_click", "event", event.id). */
export function track(name: string, targetType?: string, targetId?: string) {
  send({ type: "event", name, targetType, targetId, path: window.location.pathname });
}
