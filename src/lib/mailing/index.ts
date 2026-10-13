import "server-only";
import { ensureAutomations } from "@/lib/mailing/queue";
import { runSchedules } from "@/lib/mailing/schedules";
import { cleanUpJobs, processQueue } from "@/lib/mailing/worker";

let started = false;

/** While the server runs: send due emails every minute, scan for scheduled ones every 5 minutes. */
export function startMailing() {
  if (started) return;
  started = true;
  const safely = (name: string, task: () => Promise<unknown>) => () =>
    void task().catch((error) => console.error(`[mailing] ${name} failed:`, error));

  void ensureAutomations()
    .catch((error) => console.error("[mailing] automations setup failed:", error))
    .finally(() => {
      safely("schedules", runSchedules)();
      setInterval(safely("schedules", runSchedules), 5 * 60_000).unref();
      setInterval(safely("queue", processQueue), 60_000).unref();
      setInterval(safely("clean-up", cleanUpJobs), 60 * 60_000).unref();
    });
}
