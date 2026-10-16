"use client";

import type { Checkout } from "@/components/payments/pay-sheet";

/** Asks the server to start a payment; the error carries the server's code ("already_paid"…). */
export async function startPayment(body: Record<string, unknown>): Promise<Checkout> {
  const response = await fetch("/api/v1/payments", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await response.json().catch(() => null)) as { data: Checkout | null; error: { code: string } | null } | null;
  if (!response.ok || !json?.data) throw Object.assign(new Error(""), { code: json?.error?.code ?? "error" });
  return json.data;
}
