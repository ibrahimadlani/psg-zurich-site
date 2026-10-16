"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  const viewport = window.visualViewport;
  viewport?.addEventListener("resize", onChange);
  viewport?.addEventListener("scroll", onChange);
  return () => {
    viewport?.removeEventListener("resize", onChange);
    viewport?.removeEventListener("scroll", onChange);
  };
}

/** Height hidden by the on-screen keyboard (0 when closed, or on a computer). */
function snapshot() {
  const viewport = window.visualViewport;
  if (!viewport) return 0;
  const hidden = Math.round(window.innerHeight - viewport.height - viewport.offsetTop);
  // Below that it is the browser's own toolbar moving, not a keyboard.
  return hidden > 80 ? hidden : 0;
}

/**
 * How many pixels the phone's keyboard covers at the bottom of the page, so a bar stuck to the
 * bottom (send button, reply box) can rise above it instead of hiding behind it.
 */
export function useKeyboardInset() {
  return useSyncExternalStore(subscribe, snapshot, () => 0);
}
