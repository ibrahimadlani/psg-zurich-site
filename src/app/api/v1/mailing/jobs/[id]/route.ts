import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { emailJobs } from "@/db/schema";
import { apiHandler, ok, parseBody } from "@/lib/api";
import { HttpError, requireRole } from "@/lib/permissions";

type Context = RouteContext<"/api/v1/mailing/jobs/[id]">;

/** Journal actions: try a failed or skipped email again, or cancel one still waiting. */
export const PATCH = apiHandler<Context>(async (request, { params }) => {
  await requireRole("admin");
  const { id } = await params;
  const { action } = await parseBody(request, z.object({ action: z.enum(["retry", "cancel"]) }));
  const [result] =
    action === "retry"
      ? await db
          .update(emailJobs)
          .set({ status: "pending", attempts: 0, lastError: null, sendAfter: new Date() })
          .where(and(eq(emailJobs.id, id), inArray(emailJobs.status, ["failed", "skipped", "cancelled"])))
      : await db.update(emailJobs).set({ status: "cancelled" }).where(and(eq(emailJobs.id, id), eq(emailJobs.status, "pending")));
  if (result.affectedRows !== 1) throw new HttpError(409, "invalid_status", "Not possible in this state.");
  return ok({ id, action });
});
