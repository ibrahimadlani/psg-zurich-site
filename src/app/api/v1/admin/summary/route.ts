import { connection } from "next/server";
import { adminCounters } from "@/lib/admin/dashboard";
import { apiHandler, ok } from "@/lib/api";
import { requireCapability } from "@/lib/permissions";

/** Badge numbers of the admin navigation (pending requests, unpaid fees, failed emails). */
export const GET = apiHandler(async () => {
  await connection();
  const session = await requireCapability("area");
  return ok(await adminCounters(session.user.role));
});
