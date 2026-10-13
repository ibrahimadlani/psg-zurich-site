import { asc, eq } from "drizzle-orm";
import { getFormatter, getTranslations } from "next-intl/server";
import { DuesToggle } from "@/components/admin/dues-toggle";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { members } from "@/db/schema";
import { isDuesPaid, seasonEnd } from "@/lib/dues";

/** Accepted members and their fee for the season: still to pay first. */
export async function DuesAdmin() {
  const [t, format] = await Promise.all([getTranslations("AdminDues"), getFormatter()]);
  const rows = await db
    .select({
      id: members.id,
      firstName: members.firstName,
      lastName: members.lastName,
      memberNumber: members.memberNumber,
      status: members.status,
      expiresOn: members.expiresOn,
    })
    .from(members)
    .where(eq(members.status, "active"))
    .orderBy(asc(members.lastName), asc(members.firstName));
  const list = rows
    .map((row) => ({ ...row, paid: isDuesPaid(row) }))
    .sort((a, b) => Number(a.paid) - Number(b.paid));
  const unpaid = list.filter((row) => !row.paid).length;
  const day = (value: string) => format.dateTime(new Date(`${value}T12:00:00Z`), { dateStyle: "medium" });

  return (
    <Card id="cotisations" className="scroll-mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {t("title")}
          {unpaid > 0 ? <Badge variant="destructive">{unpaid}</Badge> : null}
        </CardTitle>
        <CardDescription>{t("description", { end: day(seasonEnd()) })}</CardDescription>
      </CardHeader>
      <CardContent>
        {list.length > 0 ? (
          <ul className="divide-y rounded-lg border">
            {list.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {row.firstName} {row.lastName}
                    {row.memberNumber ? <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">{row.memberNumber}</span> : null}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {row.paid ? t("paidUntil", { date: day(row.expiresOn!) }) : t("unpaid")}
                  </p>
                </div>
                <Badge variant={row.paid ? "secondary" : "destructive"}>{row.paid ? t("badgePaid") : t("badgeUnpaid")}</Badge>
                <DuesToggle id={row.id} paid={row.paid} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        )}
      </CardContent>
    </Card>
  );
}
