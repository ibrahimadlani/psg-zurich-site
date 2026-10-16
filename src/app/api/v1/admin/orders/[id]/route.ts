import { z } from "zod";
import { apiHandler, ok, parseBody } from "@/lib/api";
import { getClientIp } from "@/lib/audit";
import { updateOrder } from "@/lib/payments/orders";
import { requireCapability } from "@/lib/permissions";

type Context = RouteContext<"/api/v1/admin/orders/[id]">;

/** An order moves on: ready to pick up, handed over (also from the door's scanner), or shipped. */
export const PATCH = apiHandler<Context>(async (request, { params }) => {
  const { id } = await params;
  const { status, trackingNumber } = await parseBody(
    request,
    z.object({ status: z.enum(["paid", "ready", "handed_over", "shipped"]), trackingNumber: z.string().trim().max(80).optional() }),
  );
  // Handing an order over happens at the door: the scanner's team may do it.
  const session = await requireCapability(status === "handed_over" ? "scan" : "finances");
  return ok(await updateOrder(id, status, { actorId: session.user.id, ipAddress: getClientIp(request.headers), trackingNumber }));
});
