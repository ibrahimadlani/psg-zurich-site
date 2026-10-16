import { apiHandler, ok, parseBody } from "@/lib/api";
import { getClientIp } from "@/lib/audit";
import { productSchema, saveProduct } from "@/lib/payments/products-admin";
import { requireCapability } from "@/lib/permissions";

/** A new product of the shop, with its sizes and stock. */
export const POST = apiHandler(async (request) => {
  const session = await requireCapability("finances");
  const input = await parseBody(request, productSchema);
  const id = await saveProduct(input, { actorId: session.user.id, ipAddress: getClientIp(request.headers) });
  return ok({ id }, { status: 201 });
});
