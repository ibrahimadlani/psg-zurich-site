/*
 * Every automated email of the site, with its default settings. The committee can turn
 * each one on or off, change its delay and its texts (admin › Mailing); the trigger itself
 * stays in the code (src/lib/mailing/triggers.ts and schedules.ts).
 */

/** Who may turn it off: transactional emails always go out. */
export type MailCategory = "transactional" | "events" | "reminders" | "results" | "news";
export type MailGroup = "membership" | "fee" | "events" | "predictions";

export type AutomationDef = {
  key: string;
  group: MailGroup;
  category: MailCategory;
  /** Namespace of the default texts: messages › Emails.<messages>. */
  messages: string;
  /** Minutes between the trigger and the sending (editable). */
  delay: number;
  /** Sent to a member, or to the committee (admins + the club address). */
  audience: "member" | "committee";
  /** Variables usable in the texts, besides {firstName} and {email}. */
  variables: string[];
  /** Fired by something happening on the site, or found by the periodic scan. */
  trigger: "event" | "schedule";
};

const def = (key: string, rest: Omit<AutomationDef, "key">): AutomationDef => ({ key, ...rest });

export const AUTOMATIONS = [
  // Membership
  def("membership.received", { group: "membership", category: "transactional", messages: "membershipReceived", delay: 0, audience: "member", variables: [], trigger: "event" }),
  def("membership.toCommittee", { group: "membership", category: "transactional", messages: "membershipRequest", delay: 0, audience: "committee", variables: ["name", "city"], trigger: "event" }),
  def("membership.verifyReminder", { group: "membership", category: "transactional", messages: "verifyReminder", delay: 0, audience: "member", variables: [], trigger: "schedule" }),
  def("membership.committeeDigest", { group: "membership", category: "transactional", messages: "committeeDigest", delay: 0, audience: "committee", variables: ["count", "names"], trigger: "schedule" }),
  def("membership.approved", { group: "membership", category: "transactional", messages: "membershipApproved", delay: 0, audience: "member", variables: ["number"], trigger: "event" }),
  def("membership.rejected", { group: "membership", category: "transactional", messages: "membershipRejected", delay: 0, audience: "member", variables: [], trigger: "event" }),
  def("membership.completeProfile", { group: "membership", category: "news", messages: "completeProfile", delay: 0, audience: "member", variables: [], trigger: "schedule" }),
  def("account.deleted", { group: "membership", category: "transactional", messages: "accountDeleted", delay: 0, audience: "member", variables: [], trigger: "event" }),
  // Fee
  def("fee.reminder", { group: "fee", category: "transactional", messages: "feeReminder", delay: 0, audience: "member", variables: ["fee"], trigger: "schedule" }),
  def("fee.receipt", { group: "fee", category: "transactional", messages: "feeReceipt", delay: 0, audience: "member", variables: ["until"], trigger: "event" }),
  def("fee.renewal", { group: "fee", category: "transactional", messages: "feeRenewal", delay: 0, audience: "member", variables: ["until", "fee"], trigger: "schedule" }),
  def("fee.expired", { group: "fee", category: "transactional", messages: "feeExpired", delay: 0, audience: "member", variables: ["fee"], trigger: "schedule" }),
  // Events
  def("event.new", { group: "events", category: "events", messages: "newEvent", delay: 0, audience: "member", variables: ["event", "date", "place"], trigger: "event" }),
  def("event.almostFull", { group: "events", category: "events", messages: "eventAlmostFull", delay: 0, audience: "member", variables: ["event", "date", "left"], trigger: "event" }),
  def("event.reminder", { group: "events", category: "transactional", messages: "eventReminder", delay: 0, audience: "member", variables: ["event", "date", "place"], trigger: "schedule" }),
  def("event.waitlistPromoted", { group: "events", category: "transactional", messages: "waitlistPromoted", delay: 0, audience: "member", variables: ["event"], trigger: "event" }),
  def("event.cancelled", { group: "events", category: "transactional", messages: "eventCancelled", delay: 0, audience: "member", variables: ["event", "date"], trigger: "event" }),
  def("event.thanks", { group: "events", category: "events", messages: "eventThanks", delay: 0, audience: "member", variables: ["event"], trigger: "schedule" }),
  // Predictions & engagement
  def("prediction.reminder", { group: "predictions", category: "reminders", messages: "predictionReminder", delay: 0, audience: "member", variables: ["match", "competition", "time"], trigger: "schedule" }),
  def("prediction.result", { group: "predictions", category: "results", messages: "predictionResult", delay: 0, audience: "member", variables: ["match", "score", "prediction", "points"], trigger: "event" }),
  def("leaderboard.monthly", { group: "predictions", category: "results", messages: "leaderboardMonthly", delay: 0, audience: "member", variables: ["month", "rank", "total", "points"], trigger: "schedule" }),
  def("engagement.inactive", { group: "predictions", category: "news", messages: "inactive", delay: 0, audience: "member", variables: [], trigger: "schedule" }),
] as const satisfies readonly AutomationDef[];

export type AutomationKey = (typeof AUTOMATIONS)[number]["key"];

export const automation = (key: string) => AUTOMATIONS.find((item) => item.key === key) as AutomationDef | undefined;

export const MAIL_GROUPS: MailGroup[] = ["membership", "fee", "events", "predictions"];
