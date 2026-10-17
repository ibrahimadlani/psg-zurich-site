import { z } from "zod";
import { db } from "@/db";
import { duesRates, shopSettings } from "@/db/schema";
import { apiHandler, ok, parseBody } from "@/lib/api";
import { getClientIp, writeAuditLog } from "@/lib/audit";
import { requireCapability } from "@/lib/permissions";

const centimes = z.number().int().min(0).max(100_000_00);

/** The season's fee (adult, junior) as voted by the assembly, and the shop's postage. */
export const PUT = apiHandler(async (request) => {
  const session = await requireCapability("finances");
  const input = await parseBody(
    request,
    z.object({
      rates: z.object({ season: z.string().regex(/^\d{4}\/\d{2}$/), adult: centimes, junior: centimes }).optional(),
      shipping: z.object({ fee: centimes, enabled: z.boolean() }).optional(),
      shop: z.object({ enabled: z.boolean() }).optional(),
    }),
  );
  const ipAddress = getClientIp(request.headers);
  if (input.rates) {
    const { season, adult, junior } = input.rates;
    await db
      .insert(duesRates)
      .values({ season, adultAmount: adult, juniorAmount: junior, setById: session.user.id })
      .onDuplicateKeyUpdate({ set: { adultAmount: adult, juniorAmount: junior, setById: session.user.id } });
    await writeAuditLog({ actorId: session.user.id, action: "payment.rates", entityType: "dues_rates", entityId: null, metadata: { season, adult, junior }, ipAddress });
  }
  if (input.shipping) {
    await db
      .insert(shopSettings)
      .values({ id: 1, shippingFee: input.shipping.fee, shippingEnabled: input.shipping.enabled })
      .onDuplicateKeyUpdate({ set: { shippingFee: input.shipping.fee, shippingEnabled: input.shipping.enabled } });
    await writeAuditLog({ actorId: session.user.id, action: "payment.shipping", entityType: "shop_settings", entityId: null, metadata: input.shipping, ipAddress });
  }
  if (input.shop) {
    await db.insert(shopSettings).values({ id: 1, shopEnabled: input.shop.enabled }).onDuplicateKeyUpdate({ set: { shopEnabled: input.shop.enabled } });
    await writeAuditLog({ actorId: session.user.id, action: "payment.shop_open", entityType: "shop_settings", entityId: null, metadata: input.shop, ipAddress });
  }
  return ok({ saved: true });
});
