"use client";

import { toast } from "sonner";

type Translate = (key: "error" | "toastRegistered" | "toastWaitlisted" | "toastCancelled") => string;

/** Signs up for (POST) or out of (DELETE) an event and says how it went in a toast. */
export async function sendAttendance(eventId: string, method: "POST" | "DELETE", t: Translate) {
  const response = await fetch(`/api/v1/events/${eventId}/attendance`, { method });
  if (!response.ok) {
    toast.error(t("error"));
    return;
  }
  const { data } = (await response.json()) as { data: { status: string } };
  toast.success(
    t(data.status === "waitlisted" ? "toastWaitlisted" : data.status === "cancelled" ? "toastCancelled" : "toastRegistered"),
  );
}
