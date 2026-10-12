import { eq } from "drizzle-orm";
import { getFormatter, getTranslations } from "next-intl/server";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { members, type MemberStatus } from "@/db/schema";
import { Link } from "@/i18n/navigation";
import { LEGAL } from "@/lib/legal";

const statusVariant: Record<MemberStatus, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  active: "default",
  expired: "outline",
  suspended: "destructive",
  rejected: "destructive",
};

/** Membership status, number and join date, with what happens next. */
export async function MembershipCard({ userId, isAdmin }: { userId: string; isAdmin: boolean }) {
  const [t, format] = await Promise.all([getTranslations("MemberArea"), getFormatter()]);
  const [member] = await db
    .select({ status: members.status, memberNumber: members.memberNumber, joinedOn: members.joinedOn })
    .from(members)
    .where(eq(members.userId, userId));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {t("membership.title")}
          {member ? <Badge variant={statusVariant[member.status]}>{t(`membership.status.${member.status}`)}</Badge> : null}
        </CardTitle>
        <CardDescription>
          {member ? t(`membership.help.${member.status}`, { email: LEGAL.email }) : t("membership.noProfile")}
        </CardDescription>
      </CardHeader>
      {member ? (
        <CardContent>
          <dl className="grid gap-4 text-sm sm:grid-cols-3">
            <div className="space-y-1">
              <dt className="text-muted-foreground">{t("membership.number")}</dt>
              <dd className="font-mono font-medium">{member.memberNumber ?? "—"}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-muted-foreground">{t("membership.joined")}</dt>
              <dd className="font-medium">
                {member.joinedOn ? format.dateTime(new Date(`${member.joinedOn}T12:00:00Z`), { dateStyle: "long" }) : "—"}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-muted-foreground">{t("membership.fee")}</dt>
              <dd className="text-muted-foreground">{t("membership.feeSoon")}</dd>
            </div>
          </dl>
        </CardContent>
      ) : null}
      <CardFooter className="flex flex-wrap gap-2">
        {isAdmin ? (
          <Button asChild>
            <Link href="/admin" prefetch={false}>
              {t("adminLink")}
            </Link>
          </Button>
        ) : null}
        <SignOutButton />
      </CardFooter>
    </Card>
  );
}
