import "server-only";
import { eq, inArray, type SQL } from "drizzle-orm";
import { createTranslator } from "next-intl";
import { createElement } from "react";
import { db } from "@/db";
import { events, members, user, type Locale } from "@/db/schema";
import { AuthLinkEmail } from "@/emails/auth-link";
import { loadMessages } from "@/i18n/messages";
import { LEGAL } from "@/lib/legal";
import { sendMail } from "@/lib/mail";

// Empty in local dev (autoPort): links then point to the default dev port.
const siteUrl = () => process.env.BETTER_AUTH_URL || "http://localhost:3000";

async function findMemberWithEmail(where: SQL) {
  const [row] = await db
    .select({
      firstName: members.firstName,
      lastName: members.lastName,
      city: members.city,
      status: members.status,
      locale: members.locale,
      memberNumber: members.memberNumber,
      email: user.email,
    })
    .from(members)
    .innerJoin(user, eq(user.id, members.userId))
    .where(where);
  return row;
}

/**
 * "New membership request" to every admin and to the club mailbox. Sent once the
 * applicant has confirmed their address, so unconfirmed (or robot) sign-ups stay silent.
 */
export async function notifyNewMembershipRequest(userId: string) {
  const member = await findMemberWithEmail(eq(members.userId, userId));
  if (!member || member.status !== "pending") return;

  const admins = await db.select({ email: user.email }).from(user).where(inArray(user.role, ["admin", "superadmin"]));
  const recipients = [...new Set([LEGAL.email, ...admins.map((admin) => admin.email)])];

  const t = createTranslator({ locale: "fr", messages: await loadMessages("fr"), namespace: "Emails.membershipRequest" });
  const values = {
    name: `${member.firstName} ${member.lastName}`,
    email: member.email,
    city: member.city || "—",
  };
  const react = createElement(AuthLinkEmail, {
    url: `${siteUrl()}/fr/admin#adhesions`,
    locale: "fr",
    texts: {
      preview: t("preview", values),
      heading: t("heading"),
      body: t("body", values),
      cta: t("cta"),
      ignore: t("footer"),
    },
  });

  // One email per recipient: admins never see each other's addresses.
  const results = await Promise.allSettled(
    recipients.map((to) => sendMail({ to, subject: t("subject", values), react })),
  );
  for (const result of results) {
    if (result.status === "rejected") console.error("[membership] request notification failed:", result.reason);
  }
}

/** Tells the member the committee's decision, in the language they signed up in. */
export async function sendMembershipDecision(memberId: string, decision: "approved" | "rejected") {
  const member = await findMemberWithEmail(eq(members.id, memberId));
  if (!member) return;

  const { locale } = member;
  const namespace = decision === "approved" ? "Emails.membershipApproved" : "Emails.membershipRejected";
  const t = createTranslator({ locale, messages: await loadMessages(locale), namespace });
  const values = { firstName: member.firstName, number: member.memberNumber ?? "", email: LEGAL.email };

  try {
    await sendMail({
      to: member.email,
      subject: t("subject"),
      react: createElement(AuthLinkEmail, {
        url: decision === "approved" ? `${siteUrl()}/${locale}/espace-membre` : undefined,
        locale,
        texts: {
          preview: t("preview"),
          heading: t("heading", values),
          body: t("body", values),
          cta: decision === "approved" ? t("cta") : undefined,
          ignore: t("footer", values),
        },
      }),
    });
  } catch (error) {
    // The decision is saved either way.
    console.error("[membership] decision email failed:", error);
  }
}

export type DeletedAccountInfo = { locale: Locale; memberNumber: string | null };

export async function findDeletedAccountInfo(userId: string): Promise<DeletedAccountInfo | undefined> {
  const [row] = await db
    .select({ locale: members.locale, memberNumber: members.memberNumber })
    .from(members)
    .where(eq(members.userId, userId));
  return row;
}

/** Confirms to a former member that their account and data are gone. */
export async function sendAccountDeletedEmail(email: string, locale: Locale) {
  const t = createTranslator({ locale, messages: await loadMessages(locale), namespace: "Emails.accountDeleted" });
  try {
    await sendMail({
      to: email,
      subject: t("subject"),
      react: createElement(AuthLinkEmail, {
        locale,
        texts: {
          preview: t("preview"),
          heading: t("heading"),
          body: t("body"),
          ignore: t("footer", { email: LEGAL.email }),
        },
      }),
    });
  } catch (error) {
    console.error("[account] deletion email failed:", error);
  }
}

/** A place freed up: the waitlisted member is now registered. */
export async function sendWaitlistPromotion(memberId: string, eventId: string) {
  const member = await findMemberWithEmail(eq(members.id, memberId));
  const [event] = await db.select({ title: events.title }).from(events).where(eq(events.id, eventId));
  if (!member || !event) return;

  const { locale } = member;
  const t = createTranslator({ locale, messages: await loadMessages(locale), namespace: "Emails.waitlistPromoted" });
  const values = { firstName: member.firstName, event: event.title, email: LEGAL.email };
  try {
    await sendMail({
      to: member.email,
      subject: t("subject", values),
      react: createElement(AuthLinkEmail, {
        url: `${siteUrl()}/${locale}/evenements`,
        locale,
        texts: {
          preview: t("preview", values),
          heading: t("heading", values),
          body: t("body", values),
          cta: t("cta"),
          ignore: t("footer", values),
        },
      }),
    });
  } catch (error) {
    console.error("[events] waitlist email failed:", error);
  }
}
