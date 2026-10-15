import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { EMAIL_OWNER_TYPES, LOCALES, emailTemplates } from "@/db/schema";
import { apiHandler, ok, parseBody } from "@/lib/api";
import { getClientIp, writeAuditLog } from "@/lib/audit";
import { requireCapability } from "@/lib/permissions";

const owner = z.object({
  ownerType: z.enum(EMAIL_OWNER_TYPES),
  ownerId: z.string().min(1).max(64),
  locale: z.enum(LOCALES),
});
// Automations: an empty field keeps the default text. Campaigns need a subject and a text.
const texts = owner
  .extend({
    subject: z.string().trim().max(200),
    preview: z.string().trim().max(200),
    heading: z.string().trim().max(200),
    body: z.string().trim().max(10_000),
    ctaLabel: z.string().trim().max(80).optional(),
  })
  .refine((input) => input.ownerType === "automation" || (input.subject && input.body), { path: ["body"] });

/** Save the texts of an automation or a campaign, in one language. */
export const PUT = apiHandler(async (request) => {
  const session = await requireCapability("mailing");
  const input = await parseBody(request, texts);
  await db
    .insert(emailTemplates)
    .values({ ...input, ctaLabel: input.ctaLabel || null })
    .onDuplicateKeyUpdate({
      set: { subject: input.subject, preview: input.preview, heading: input.heading, body: input.body, ctaLabel: input.ctaLabel || null },
    });
  await writeAuditLog({
    actorId: session.user.id,
    action: "mailing.template_save",
    entityType: `email_${input.ownerType}`,
    entityId: input.ownerId,
    metadata: { locale: input.locale },
    ipAddress: getClientIp(request.headers),
  });
  return ok({ saved: true });
});

/** Back to the default texts (automations) or remove a language (campaigns). */
export const DELETE = apiHandler(async (request) => {
  await requireCapability("mailing");
  const input = await parseBody(request, owner);
  await db
    .delete(emailTemplates)
    .where(and(eq(emailTemplates.ownerType, input.ownerType), eq(emailTemplates.ownerId, input.ownerId), eq(emailTemplates.locale, input.locale)));
  return ok({ deleted: true });
});
