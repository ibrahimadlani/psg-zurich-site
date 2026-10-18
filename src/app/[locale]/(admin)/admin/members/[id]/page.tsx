import { ArrowLeft, CameraOff, Mail, Phone } from "lucide-react";
import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { MemberActions } from "@/components/admin/members/member-actions";
import { AdminForbidden } from "@/components/admin/ui/admin-header";
import { StatusPill } from "@/components/admin/ui/status-pill";
import { adminLabel } from "@/components/admin/ui/styles";
import { AdminDetailSkeleton } from "@/components/skeletons";
import { UserAvatar } from "@/components/user-avatar";
import { Link } from "@/i18n/navigation";
import { adminPage } from "@/lib/admin/guard";
import { memberDetail } from "@/lib/admin/members-query";
import { ageOn, isDuesPaid, isJunior } from "@/lib/dues";
import { formatPhone } from "@/lib/phone";
import { can } from "@/lib/roles";
import { Streamed } from "@/components/ui/skeleton";

// Member ids only exist at runtime.
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("AdminMembers");
  return { title: t("title"), robots: { index: false } };
}

const rowClass = "grid grid-cols-1 gap-1 border-b py-3.5 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4";
const termClass = "font-wide text-[10px] font-semibold tracking-[0.06em] text-muted-foreground uppercase sm:pt-1";

function Row({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className={rowClass}>
      <dt className={termClass}>{term}</dt>
      <dd className="min-w-0 text-[15px]">{children}</dd>
    </div>
  );
}

async function MemberDetail({ id }: { id: string }) {
  await connection();
  const [t, tProfile, tLocale, format] = await Promise.all([
    getTranslations("AdminMembers"),
    getTranslations("MemberProfile"),
    getTranslations("LocaleSwitcher"),
    getFormatter(),
  ]);
  const session = await adminPage("members.read");
  if (!session) return <AdminForbidden message={(await getTranslations("Admin"))("forbidden")} />;
  const detail = await memberDetail(id);
  if (!detail) notFound();
  const { member, email, emailVerified, image, history, attended } = detail;
  const name = `${member.firstName} ${member.lastName}`.trim();
  const paid = isDuesPaid(member);
  const day = (value: string) => format.dateTime(new Date(`${value}T12:00:00Z`), { dateStyle: "long" });
  const statusTone = member.status === "active" ? "ok" : member.status === "pending" ? "warn" : member.status === "rejected" || member.status === "suspended" ? "danger" : "neutral";
  const address = [member.address, [member.postcode, member.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");

  return (
    <article className="space-y-8">
      <header className="flex items-start gap-4">
        <UserAvatar name={name} email={email} image={image} className="size-14 rounded-[12px] text-[14px] sm:size-16" />
        <div className="min-w-0 flex-1 space-y-2">
          <h1 className="font-narrow text-[length:clamp(30px,6vw,44px)] leading-[0.92] font-extrabold text-balance [overflow-wrap:anywhere] uppercase italic">
            {name || email}
          </h1>
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusPill tone={statusTone}>{t(`statuses.${member.status}`)}</StatusPill>
            {member.status === "active" ? <StatusPill tone={paid ? "ok" : "danger"}>{t(paid ? "pills.paid" : "pills.unpaid")}</StatusPill> : null}
            {!emailVerified ? <StatusPill>{t("pills.unverified")}</StatusPill> : null}
            {isJunior(member.birthDate) ? <StatusPill tone="brand">{tProfile("junior")}</StatusPill> : null}
            {member.photoConsent !== true ? (
              <StatusPill>
                <CameraOff aria-hidden />
                {tProfile("noPhotos")}
              </StatusPill>
            ) : null}
            {member.memberNumber ? <span className="font-mono text-[12px] text-muted-foreground">{member.memberNumber}</span> : null}
          </div>
        </div>
      </header>

      <MemberActions
        id={member.id}
        name={name}
        status={member.status}
        emailVerified={emailVerified}
        paid={paid}
        canWrite={can(session.user.role, "members.write")}
        profile={{
          firstName: member.firstName,
          lastName: member.lastName,
          phone: member.phone ?? "",
          address: member.address ?? "",
          postcode: member.postcode ?? "",
          city: member.city ?? "",
          birthDate: member.birthDate ?? "",
          locale: member.locale,
        }}
      />

      <section className="space-y-2">
        <h2 className={adminLabel}>{t("sections.contact")}</h2>
        <dl className="border-t">
          <Row term={t("fields.email")}>
            <a href={`mailto:${email}`} className="inline-flex items-center gap-2 break-all hover:underline">
              <Mail className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
              {email}
            </a>
          </Row>
          <Row term={t("fields.phone")}>
            {member.phone ? (
              <a href={`tel:${member.phone}`} className="inline-flex items-center gap-2 hover:underline">
                <Phone className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                {formatPhone(member.phone)}
              </a>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </Row>
          <Row term={t("fields.address")}>{address || <span className="text-muted-foreground">—</span>}</Row>
          <Row term={t("fields.language")}>{tLocale(member.locale)}</Row>
        </dl>
      </section>

      <section className="space-y-2">
        <h2 className={adminLabel}>{t("sections.membership")}</h2>
        <dl className="border-t">
          <Row term={t("fields.requested")}>{format.dateTime(member.createdAt, { dateStyle: "long" })}</Row>
          {member.joinedOn ? <Row term={t("fields.joined")}>{day(member.joinedOn)}</Row> : null}
          {member.status === "active" ? (
            <Row term={t("fields.dues")}>{paid && member.expiresOn ? t("paidUntil", { date: day(member.expiresOn) }) : <span className="text-psg-red">{t("pills.unpaid")}</span>}</Row>
          ) : null}
        </dl>
      </section>

      <section className="space-y-2">
        <h2 className={adminLabel}>{t("sections.profile")}</h2>
        <dl className="border-t">
          <Row term={t("fields.birthDate")}>
            {member.birthDate ? (
              <>
                {day(member.birthDate)} <span className="text-muted-foreground">· {tProfile("age", { age: ageOn(member.birthDate) })}</span>
              </>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </Row>
          <Row term={t("fields.interests")}>
            {member.interests?.length ? (
              <span className="flex flex-wrap gap-1.5">
                {member.interests.map((interest) => (
                  <StatusPill key={interest}>{tProfile(`interests.${interest}`)}</StatusPill>
                ))}
              </span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </Row>
          <Row term={t("fields.ticketing")}>
            {member.psgTicketing ? tProfile(`ticketing.${member.psgTicketing}.label`) : <span className="text-muted-foreground">—</span>}
          </Row>
          <Row term={t("fields.photos")}>
            {member.photoConsent === null ? (
              <span className="text-muted-foreground">{t("photos.none")}</span>
            ) : (
              <>
                {t(member.photoConsent ? "photos.yes" : "photos.no")}
                {member.photoConsentAt ? <span className="text-muted-foreground"> · {format.dateTime(member.photoConsentAt, { dateStyle: "medium" })}</span> : null}
              </>
            )}
          </Row>
        </dl>
      </section>

      <section className="space-y-2">
        <h2 className={adminLabel}>{t("sections.events")}</h2>
        {attended.length ? (
          <ul className="divide-y border-y">
            {attended.map((row) => (
              <li key={row.eventId} className="flex items-center gap-3 py-3">
                <span className="w-14 shrink-0 text-[13px] text-muted-foreground tabular-nums">{format.dateTime(row.startsAt, { day: "numeric", month: "short" })}</span>
                <span className="min-w-0 flex-1 truncate text-[15px]">{row.title}</span>
                <StatusPill tone={row.checkedInAt ? "ok" : row.status === "cancelled" ? "neutral" : "brand"}>
                  {t(row.checkedInAt ? "attendance.present" : `attendance.${row.status}`)}
                </StatusPill>
              </li>
            ))}
          </ul>
        ) : (
          <p className="border-t pt-3 text-sm text-muted-foreground">{t("noEvents")}</p>
        )}
      </section>

      <section className="space-y-2">
        <h2 className={adminLabel}>{t("sections.history")}</h2>
        {history.length ? (
          <ol className="space-y-0 border-t">
            {history.map((entry) => {
              const key = `history.${entry.action.replace(".", "_")}`;
              const reason = typeof entry.metadata?.reason === "string" ? entry.metadata.reason : null;
              return (
                <li key={entry.id} className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 border-b py-3">
                  <span aria-hidden className="mt-1.5 size-2 rounded-full bg-psg-blue dark:bg-foreground/60" />
                  <span className="text-[14px]">
                    {t.has(key as never) ? t(key as never) : entry.action}
                    {reason ? <span className="mt-0.5 block text-muted-foreground">« {reason} »</span> : null}
                    <span className="mt-0.5 block text-[12px] text-muted-foreground">
                      {entry.actorName || entry.actorEmail || t("system")} · {format.dateTime(entry.createdAt, { dateStyle: "medium", timeStyle: "short" })}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="border-t pt-3 text-sm text-muted-foreground">{t("noHistory")}</p>
        )}
      </section>
    </article>
  );
}

export default async function MemberPage({ params }: PageProps<"/[locale]/admin/members/[id]">) {
  const t = await getTranslations("AdminMembers");
  const { id } = await params;
  return (
    <div className="space-y-5">
      {/* Phones only: on a computer the list stays on the left. */}
      <Link
        href="/admin/members"
        className="inline-flex items-center gap-2 font-wide text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase transition-colors hover:text-foreground lg:hidden"
      >
        <ArrowLeft className="size-3" aria-hidden />
        {t("back")}
      </Link>
      <Streamed fallback={<AdminDetailSkeleton />}>
        <MemberDetail id={id} />
      </Streamed>
    </div>
  );
}
