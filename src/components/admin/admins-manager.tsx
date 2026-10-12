import { asc, inArray } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { AddAdminForm, RemoveAdminButton } from "@/components/admin/admin-role-controls";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { user } from "@/db/schema";

/** Admins list, name / remove an admin. Rendered for superadmins only. */
export async function AdminsManager({ currentUserId }: { currentUserId: string }) {
  const t = await getTranslations("AdminRoles");
  const admins = await db
    .select({ id: user.id, name: user.name, email: user.email, role: user.role })
    .from(user)
    .where(inArray(user.role, ["admin", "superadmin"]))
    .orderBy(asc(user.name));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="divide-y rounded-lg border">
          {admins.map((admin) => (
            <li key={admin.id} className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-medium">
                  {admin.name || admin.email}
                  <Badge variant={admin.role === "superadmin" ? "default" : "secondary"}>{t(admin.role === "superadmin" ? "roles.superadmin" : "roles.admin")}</Badge>
                  {admin.id === currentUserId ? <span className="text-xs text-muted-foreground">{t("you")}</span> : null}
                </p>
                <p className="truncate text-sm text-muted-foreground">{admin.email}</p>
              </div>
              {admin.role === "admin" ? <RemoveAdminButton email={admin.email} /> : null}
            </li>
          ))}
        </ul>
        <AddAdminForm />
      </CardContent>
    </Card>
  );
}
