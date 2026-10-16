import "server-only";
import type { ShopAccess } from "@/components/shop/shop-cart";
import { getCurrentMember } from "@/lib/members";
import { getSession } from "@/lib/permissions";

/** Who is in the shop: a visitor, someone waiting for the committee, or a member who can buy. */
export async function shopVisitor() {
  const [session, member] = await Promise.all([getSession(), getCurrentMember()]);
  const access: ShopAccess = !session ? "guest" : member?.status === "active" ? "member" : "pending";
  const profile = member
    ? { name: `${member.firstName} ${member.lastName}`.trim(), street: member.address ?? "", postcode: member.postcode ?? "", city: member.city ?? "" }
    : null;
  return { access, profile };
}
