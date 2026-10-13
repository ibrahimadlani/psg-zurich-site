import { asc, desc, eq, inArray } from "drizzle-orm";
import { getFormatter, getTranslations } from "next-intl/server";
import { MemberDecisionActions } from "@/components/admin/member-decision-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { members, user } from "@/db/schema";
import { ageOn, isJunior } from "@/lib/dues";
import { formatPhone } from "@/lib/phone";

const columns = {
  id: members.id,
  firstName: members.firstName,
  lastName: members.lastName,
  phone: members.phone,
  city: members.city,
  status: members.status,
  memberNumber: members.memberNumber,
  createdAt: members.createdAt,
  updatedAt: members.updatedAt,
  email: user.email,
  emailVerified: user.emailVerified,
  birthDate: members.birthDate,
  interests: members.interests,
  psgTicketing: members.psgTicketing,
  photoConsent: members.photoConsent,
};

/** Pending membership requests (accept / refuse), then the latest decisions. */
export async function MembershipRequests() {
  const [t, tProfile, format] = await Promise.all([getTranslations("AdminMembers"), getTranslations("MemberProfile"), getFormatter()]);
  const [requests, decided] = await Promise.all([
    db
      .select(columns)
      .from(members)
      .innerJoin(user, eq(user.id, members.userId))
      .where(eq(members.status, "pending"))
      .orderBy(asc(members.createdAt)),
    db
      .select(columns)
      .from(members)
      .innerJoin(user, eq(user.id, members.userId))
      .where(inArray(members.status, ["active", "rejected"]))
      .orderBy(desc(members.updatedAt))
      .limit(10),
  ]);
  const date = (value: Date) => format.dateTime(value, { dateStyle: "medium" });

  return (
    <Card id="adhesions" className="scroll-mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {t("title")}
          {requests.length > 0 ? <Badge>{requests.length}</Badge> : null}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {requests.length > 0 ? (
          <ul className="divide-y rounded-lg border">
            {requests.map((row) => (
              <li key={row.id} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">
                      {row.firstName} {row.lastName}
                    </span>
                    {row.emailVerified ? null : <Badge variant="outline">{t("unverified")}</Badge>}
                    {/* Statutes: under 18 needs a guardian's consent and pays the junior fee. */}
                    {isJunior(row.birthDate) ? (
                      <Badge variant="secondary">
                        {tProfile("junior")} · {tProfile("age", { age: ageOn(row.birthDate!) })}
                      </Badge>
                    ) : null}
                    {row.photoConsent === true ? null : <Badge variant="outline">{tProfile("noPhotos")}</Badge>}
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    {[row.email, formatPhone(row.phone), row.city].filter(Boolean).join(" · ")}
                  </p>
                  {row.psgTicketing || row.interests?.length ? (
                    <p className="text-xs text-muted-foreground">
                      {[
                        row.psgTicketing ? tProfile(`ticketing.${row.psgTicketing}.label`) : null,
                        ...(row.interests ?? []).map((item) => tProfile(`interests.${item}`)),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">{t("requestedOn", { date: date(row.createdAt) })}</p>
                </div>
                <MemberDecisionActions id={row.id} status="pending" emailVerified={row.emailVerified} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        )}

        {decided.length > 0 ? (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">{t("recent")}</h3>
            <ul className="divide-y rounded-lg border">
              {decided.map((row) => (
                <li key={row.id} className="flex flex-col gap-2 p-3 text-sm sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                    <Badge variant={row.status === "active" ? "default" : "destructive"}>{t(row.status === "active" ? "status.active" : "status.rejected")}</Badge>
                    <span className="font-medium">
                      {row.firstName} {row.lastName}
                    </span>
                    {row.memberNumber ? <span className="font-mono text-xs text-muted-foreground">{row.memberNumber}</span> : null}
                    <span className="text-xs text-muted-foreground">{date(row.updatedAt)}</span>
                  </div>
                  {row.status === "rejected" ? (
                    <MemberDecisionActions id={row.id} status="rejected" emailVerified={row.emailVerified} />
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
