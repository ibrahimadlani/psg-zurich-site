import { z } from "zod";
import { LOCALES } from "@/db/schema";
import { apiHandler, ok, parseBody } from "@/lib/api";
import { requireActiveMember } from "@/lib/members";
import { checkCart } from "@/lib/payments/shop";

/** The browser's cart checked against the shop (today's prices, what is left), for the checkout page. */
export const POST = apiHandler(async (request) => {
  await requireActiveMember();
  const { items, locale } = await parseBody(
    request,
    z.object({
      locale: z.enum(LOCALES).default("fr"),
      items: z.array(z.object({ variantId: z.string().min(1).max(36), quantity: z.number().int().min(1).max(10) })).max(20),
    }),
  );
  return ok(await checkCart(items, locale));
});
