import type { Role } from "@/db/schema";

const RANK: Record<Role, number> = { member: 1, admin: 2, superadmin: 3 };

export function hasRole(role: Role | null | undefined, required: Role) {
  return role ? RANK[role] >= RANK[required] : false;
}
