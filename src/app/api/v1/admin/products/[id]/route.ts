import { apiHandler, ok, parseBody } from "@/lib/api";
import { getClientIp } from "@/lib/audit";
import { deleteProduct, productSchema, saveProduct } from "@/lib/payments/products-admin";
import { requireCapability } from "@/lib/permissions";

type Context = RouteContext<"/api/v1/admin/products/[id]">;

export const PUT = apiHandler<Context>(async (request, { params }) => {
  const session = await requireCapability("finances");
  const { id } = await params;
  const input = await parseBody(request, productSchema);
  await saveProduct(input, { id, actorId: session.user.id, ipAddress: getClientIp(request.headers) });
  return ok({ id });
});

export const DELETE = apiHandler<Context>(async (request, { params }) => {
  const session = await requireCapability("finances");
  const { id } = await params;
  await deleteProduct(id, { actorId: session.user.id, ipAddress: getClientIp(request.headers) });
  return ok({ deleted: true });
});
