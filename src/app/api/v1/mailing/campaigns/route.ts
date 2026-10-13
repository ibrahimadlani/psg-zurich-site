import { z } from "zod";
import { db } from "@/db";
import { emailCampaigns } from "@/db/schema";
import { apiHandler, ok, parseBody } from "@/lib/api";
import { requireRole } from "@/lib/permissions";

/** New campaign (draft): the texts and the audience are set in its editor. */
export const POST = apiHandler(async (request) => {
  const session = await requireRole("admin");
  const { name } = await parseBody(request, z.object({ name: z.string().trim().min(1).max(120) }));
  const id = crypto.randomUUID();
  await db.insert(emailCampaigns).values({ id, name, createdBy: session.user.id });
  return ok({ id }, { status: 201 });
});
