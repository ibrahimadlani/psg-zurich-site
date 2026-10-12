import "server-only";
import { and, eq, gte, isNull, lte, notInArray } from "drizzle-orm";
import { createTranslator } from "next-intl";
import { createElement } from "react";
import { db } from "@/db";
import { events, matches, members, predictions, user, type Locale } from "@/db/schema";
import { AuthLinkEmail } from "@/emails/auth-link";
import { loadMessages } from "@/i18n/messages";
import { sendMail } from "@/lib/mail";
import { matchTitle } from "@/lib/matches";
import { unsubscribeUrl, type NotificationType } from "@/lib/unsubscribe";

// Empty in local dev (autoPort): links then point to the default dev port.
const siteUrl = () => process.env.BETTER_AUTH_URL || "http://localhost:3000";

type Recipient = { memberId: string; firstName: string; email: string; locale: Locale };

/** Sends one email per recipient, in their language; failures are logged, never thrown. */
async function sendToEach(
  recipients: Recipient[],
  type: NotificationType,
  namespace: "Emails.newEvent" | "Emails.predictionReminder",
  build: (recipient: Recipient) => { values: Record<string, string>; path: string },
) {
  const translators = new Map<Locale, Awaited<ReturnType<typeof translatorFor>>>();
  async function translatorFor(locale: Locale) {
    return createTranslator({ locale, messages: await loadMessages(locale), namespace });
  }

  for (const recipient of recipients) {
    const t = translators.get(recipient.locale) ?? (await translatorFor(recipient.locale));
    translators.set(recipient.locale, t);
    const { values, path } = build(recipient);
    const all = { ...values, firstName: recipient.firstName };
    const unsubscribe = unsubscribeUrl(siteUrl(), recipient.locale, recipient.memberId, type);
    try {
      await sendMail({
        to: recipient.email,
        subject: t("subject", all),
        unsubscribeUrl: unsubscribe,
        react: createElement(AuthLinkEmail, {
          url: `${siteUrl()}/${recipient.locale}${path}`,
          locale: recipient.locale,
          texts: {
            preview: t("preview", all),
            heading: t("heading", all),
            body: t("body", all),
            cta: t("cta"),
            ignore: t("footer", { ...all, unsubscribe }),
          },
        }),
      });
    } catch (error) {
      console.error(`[notifications] ${type} email failed:`, error);
    }
  }
}

const recipientColumns = {
  memberId: members.id,
  firstName: members.firstName,
  email: user.email,
  locale: members.locale,
};

/** "New event" to accepted members who keep that notification on. */
export async function notifyNewEvent(eventId: string) {
  const [event] = await db.select().from(events).where(eq(events.id, eventId));
  if (!event) return;
  const recipients = await db
    .select(recipientColumns)
    .from(members)
    .innerJoin(user, eq(user.id, members.userId))
    .where(and(eq(members.status, "active"), eq(members.notifyEvents, true)));

  await sendToEach(recipients, "events", "Emails.newEvent", (recipient) => ({
    values: {
      event: event.title,
      date: new Intl.DateTimeFormat(recipient.locale, {
        timeZone: "Europe/Zurich",
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      }).format(event.startsAt),
      place: event.location ?? "—",
    },
    path: `/evenements/${event.id}`,
  }));
}

const DAY = 24 * 60 * 60 * 1000;

/**
 * "24 hours left to predict": once per match, to accepted members who keep the reminder on
 * and haven't predicted yet. Called by the scheduler every few minutes.
 */
export async function sendPredictionReminders() {
  const now = Date.now();
  const due = await db
    .select()
    .from(matches)
    .where(
      and(
        eq(matches.status, "scheduled"),
        isNull(matches.reminderSentAt),
        gte(matches.kickoffAt, new Date(now)),
        lte(matches.kickoffAt, new Date(now + DAY)),
      ),
    );

  for (const match of due) {
    // Mark first: a slow send must never lead to a second reminder.
    await db.update(matches).set({ reminderSentAt: new Date() }).where(eq(matches.id, match.id));
    const predicted = db.select({ memberId: predictions.memberId }).from(predictions).where(eq(predictions.matchId, match.id));
    const recipients = await db
      .select(recipientColumns)
      .from(members)
      .innerJoin(user, eq(user.id, members.userId))
      .where(
        and(
          eq(members.status, "active"),
          eq(members.notifyPredictionReminders, true),
          notInArray(members.id, predicted),
        ),
      );
    await sendToEach(recipients, "reminders", "Emails.predictionReminder", (recipient) => ({
      values: {
        match: matchTitle(match, "PSG"),
        competition: match.competition,
        time: new Intl.DateTimeFormat(recipient.locale, {
          timeZone: "Europe/Zurich",
          weekday: "long",
          hour: "2-digit",
          minute: "2-digit",
        }).format(match.kickoffAt),
      },
      path: `/matchs/${match.id}`,
    }));
  }
}


let remindersStarted = false;

/** Checks for due prediction reminders every 5 minutes while the server runs. */
export function startReminderScheduler() {
  if (remindersStarted) return;
  remindersStarted = true;
  const run = () =>
    void sendPredictionReminders().catch((error) => console.error("[notifications] reminders failed:", error));
  run();
  setInterval(run, 5 * 60 * 1000).unref();
}
