"use client";

import { useSyncExternalStore } from "react";
import { RETURN_PARAM, safeReturnPath } from "@/lib/return-to";

const noSubscription = () => () => {};
const fromLocation = () => safeReturnPath(new URLSearchParams(window.location.search).get(RETURN_PARAM));

/**
 * The checked `?suite=` of the current page (sign-in, membership, password reset), carried on
 * to the next step. Read from the address once mounted (null on the server), so the page needs
 * no Suspense boundary for useSearchParams.
 */
export function useReturnPath() {
  return useSyncExternalStore(noSubscription, fromLocation, () => null);
}
