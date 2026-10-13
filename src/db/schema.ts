import { sql } from "drizzle-orm";
import {
  boolean,
  customType,
  date,
  datetime,
  index,
  int,
  mediumtext,
  mysqlEnum,
  double,
  mysqlTable,
  text,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

/* -------------------------------------------------------------------------- */
/*                                   Helpers                                  */
/* -------------------------------------------------------------------------- */

const id = () =>
  varchar("id", { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

const fk = (name: string) => varchar(name, { length: 36 });

// DATETIME rather than TIMESTAMP: no 2038 limit, and no implicit
// "ON UPDATE CURRENT_TIMESTAMP" on MariaDB < 10.10. All values are UTC (see src/db/index.ts).
const dateTime3 = (name: string) => datetime(name, { fsp: 3 });

const now = sql`CURRENT_TIMESTAMP(3)`;

const createdAt = () =>
  dateTime3("created_at")
    .default(now)
    .$defaultFn(() => new Date())
    .notNull();

const updatedAt = () =>
  dateTime3("updated_at")
    .default(now)
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date())
    .notNull();

const timestamps = () => ({ createdAt: createdAt(), updatedAt: updatedAt() });

// MariaDB stores JSON as LONGTEXT and returns it as a string: parse it back.
const json = <T>(name: string) =>
  customType<{ data: T; driverData: string }>({
    dataType: () => "json",
    toDriver: (value) => JSON.stringify(value),
    fromDriver: (value) =>
      (typeof value === "string" ? JSON.parse(value) : value) as T,
  })(name);

// Content locales. Order = MySQL enum order: only ever append new values.
export const LOCALES = ["fr", "de", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const ROLES = ["member", "admin", "superadmin"] as const;
export type Role = (typeof ROLES)[number];

/* -------------------------------------------------------------------------- */
/*                         Better Auth (user, session…)                       */
/* -------------------------------------------------------------------------- */

export const user = mysqlTable("user", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  role: mysqlEnum("role", ROLES).default("member").notNull(),
  ...timestamps(),
});

export const session = mysqlTable(
  "session",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    expiresAt: dateTime3("expires_at").notNull(),
    token: varchar("token", { length: 255 }).notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: fk("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ...timestamps(),
  },
  (t) => [index("session_user_id_idx").on(t.userId)],
);

export const account = mysqlTable(
  "account",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: fk("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: dateTime3("access_token_expires_at"),
    refreshTokenExpiresAt: dateTime3("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    ...timestamps(),
  },
  (t) => [index("account_user_id_idx").on(t.userId)],
);

export const verification = mysqlTable(
  "verification",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    identifier: varchar("identifier", { length: 255 }).notNull(),
    value: text("value").notNull(),
    expiresAt: dateTime3("expires_at").notNull(),
    ...timestamps(),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

/* -------------------------------------------------------------------------- */
/*                                   Members                                  */
/* -------------------------------------------------------------------------- */

export const MEMBER_STATUSES = [
  "pending",
  "active",
  "expired",
  "suspended",
  // Refused by the committee: kept for a possible appeal to the general assembly.
  "rejected",
] as const;

export type MemberStatus = (typeof MEMBER_STATUSES)[number];

export const members = mysqlTable(
  "members",
  {
    id: id(),
    userId: fk("user_id")
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: "cascade" }),
    firstName: varchar("first_name", { length: 100 }).notNull(),
    lastName: varchar("last_name", { length: 100 }).notNull(),
    phone: varchar("phone", { length: 32 }),
    /** Street and number (optional, filled in with Google address completion). */
    address: varchar("address", { length: 255 }),
    postcode: varchar("postcode", { length: 10 }),
    city: varchar("city", { length: 100 }),
    memberNumber: varchar("member_number", { length: 20 }).unique(),
    status: mysqlEnum("status", MEMBER_STATUSES).default("pending").notNull(),
    joinedOn: date("joined_on", { mode: "string" }),
    expiresOn: date("expires_on", { mode: "string" }),
    /** Language of the emails sent to the member (the one used to sign up). */
    locale: mysqlEnum("locale", LOCALES).default("fr").notNull(),
    /** Shown in the predictions leaderboard instead of "First L." when set. */
    nickname: varchar("nickname", { length: 32 }).unique(),
    /** Still ranked, but only visible to themselves in the leaderboard. */
    hideFromLeaderboard: boolean("hide_from_leaderboard").default(false).notNull(),
    notifyEvents: boolean("notify_events").default(true).notNull(),
    notifyPredictionReminders: boolean("notify_prediction_reminders").default(true).notNull(),
    /** Points after each match and the monthly leaderboard recap. */
    notifyResults: boolean("notify_results").default(true).notNull(),
    /** Club news: campaigns and occasional nudges (profile, inactivity). */
    notifyNews: boolean("notify_news").default(true).notNull(),
    /** Last visit (at most hourly), for the "we miss you" email. */
    lastSeenAt: datetime("last_seen_at", { fsp: 3 }),
    /**
     * Random token in the QR code on the back of the member card (event check-in); unique,
     * and can be replaced if a card leaks. Created the first time the card is shown.
     */
    cardToken: varchar("card_token", { length: 32 }).unique(),
    /** Welcome step done or skipped (phone and address, asked once after signing up). */
    onboardedAt: datetime("onboarded_at", { fsp: 3 }),
    /** Last time the member opened the notification bell: newer items count as unread. */
    notificationsSeenAt: datetime("notifications_seen_at", { fsp: 3 }),
    ...timestamps(),
  },
  (t) => [index("members_status_idx").on(t.status)],
);

/* -------------------------------------------------------------------------- */
/*                                    Blog                                    */
/* -------------------------------------------------------------------------- */

export const POST_STATUSES = ["draft", "published"] as const;
/** Fixed news categories (tabs of /actualites). Order = MySQL enum order: append only. */
export const POST_CATEGORIES = ["club", "trips", "events"] as const;
export type PostCategory = (typeof POST_CATEGORIES)[number];

export const posts = mysqlTable(
  "posts",
  {
    id: id(),
    slug: varchar("slug", { length: 191 }).notNull().unique(),
    locale: mysqlEnum("locale", LOCALES).default("fr").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    excerpt: varchar("excerpt", { length: 500 }),
    /** JSON list of article blocks (see src/lib/article-blocks.ts). */
    content: mediumtext("content").notNull(),
    imageUrl: varchar("image_url", { length: 512 }),
    category: mysqlEnum("category", POST_CATEGORIES).default("club").notNull(),
    /** Same value on an article and its translations. */
    translationGroup: varchar("translation_group", { length: 36 }),
    /** Signature shown on the article ("Le comité", "Pôle déplacements"…). */
    byline: varchar("byline", { length: 80 }),
    status: mysqlEnum("status", POST_STATUSES).default("draft").notNull(),
    publishedAt: datetime("published_at"),
    authorId: fk("author_id").references(() => user.id, {
      onDelete: "set null",
    }),
    ...timestamps(),
  },
  (t) => [
    index("posts_listing_idx").on(t.status, t.locale, t.publishedAt),
    index("posts_translation_idx").on(t.translationGroup),
  ],
);

/* -------------------------------------------------------------------------- */
/*                                   Matches                                  */
/* -------------------------------------------------------------------------- */

export const MATCH_VENUES = ["home", "away", "neutral"] as const;
export const MATCH_STATUSES = [
  "scheduled",
  "live",
  "finished",
  "postponed",
  "cancelled",
] as const;

/** One entry of a match timeline (goals, cards, substitutions), from football-data.org. */
export type MatchTimelineEntry = {
  minute: number;
  extra: number | null;
  /** PSG or the opponent. */
  side: "psg" | "opponent";
  type: "goal" | "own_goal" | "penalty" | "missed_penalty" | "yellow" | "red" | "substitution" | "var";
  player: string | null;
  /** Assist for a goal, player coming on for a substitution. */
  related: string | null;
};

export const matches = mysqlTable(
  "matches",
  {
    id: id(),
    /** Match id at football-data.org; null for matches entered by hand. */
    externalId: int("external_id").unique(),
    /** Season start year (2026 = 2026/27). */
    season: int("season"),
    opponent: varchar("opponent", { length: 120 }).notNull(),
    opponentLogo: varchar("opponent_logo", { length: 255 }),
    competition: varchar("competition", { length: 120 }).notNull(),
    competitionLogo: varchar("competition_logo", { length: 255 }),
    /** "REGULAR_SEASON:9", "LEAGUE_STAGE:3", "LAST_16"… (stage and matchday from the API). */
    round: varchar("round", { length: 80 }),
    kickoffAt: datetime("kickoff_at").notNull(),
    venue: mysqlEnum("venue", MATCH_VENUES).notNull(),
    stadium: varchar("stadium", { length: 160 }),
    city: varchar("city", { length: 120 }),
    referee: varchar("referee", { length: 120 }),
    /** Final score, extra time included. */
    psgScore: int("psg_score"),
    opponentScore: int("opponent_score"),
    /** Score after 90 minutes: the one predictions are scored against. */
    regulationPsgScore: int("regulation_psg_score"),
    regulationOpponentScore: int("regulation_opponent_score"),
    penaltyPsgScore: int("penalty_psg_score"),
    penaltyOpponentScore: int("penalty_opponent_score"),
    status: mysqlEnum("status", MATCH_STATUSES).default("scheduled").notNull(),
    /** Short status for the UI: NS, LIVE, HT (half-time), ET, P (penalties), FT, PST, CANC… */
    statusDetail: varchar("status_detail", { length: 8 }),
    /** Minute of play while live. */
    elapsed: int("elapsed"),
    timeline: json<MatchTimelineEntry[]>("timeline"),
    syncedAt: dateTime3("synced_at"),
    /** When the "24 h left to predict" email went out (once per match). */
    reminderSentAt: dateTime3("reminder_sent_at"),
    ...timestamps(),
  },
  (t) => [index("matches_kickoff_idx").on(t.kickoffAt), index("matches_season_idx").on(t.season)],
);

/* -------------------------------------------------------------------------- */
/*                                   Events                                   */
/* -------------------------------------------------------------------------- */

export const EVENT_TYPES = [
  "watch_party",
  "away_trip",
  "members_match",
  "social",
  "other",
] as const;

export const events = mysqlTable(
  "events",
  {
    id: id(),
    type: mysqlEnum("type", EVENT_TYPES).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    matchId: fk("match_id").references(() => matches.id, {
      onDelete: "set null",
    }),
    /** Name of the place ("Bar Le Parisien"); the address below locates it on the map. */
    location: varchar("location", { length: 255 }),
    address: varchar("address", { length: 255 }),
    /** Google place id of the address, for the "open in Google Maps" link. */
    placeId: varchar("place_id", { length: 255 }),
    latitude: double("latitude"),
    longitude: double("longitude"),
    startsAt: datetime("starts_at").notNull(),
    endsAt: datetime("ends_at"),
    // null = unlimited
    capacity: int("capacity"),
    priceCents: int("price_cents").default(0).notNull(),
    membersOnly: boolean("members_only").default(false).notNull(),
    ...timestamps(),
  },
  (t) => [index("events_starts_at_idx").on(t.startsAt)],
);

export const ATTENDANCE_STATUSES = [
  "registered",
  "waitlisted",
  "cancelled",
  "attended",
] as const;
export const PAYMENT_STATUSES = [
  "not_required",
  "pending",
  "paid",
  "refunded",
] as const;

export const attendance = mysqlTable(
  "attendance",
  {
    id: id(),
    eventId: fk("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    memberId: fk("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    status: mysqlEnum("status", ATTENDANCE_STATUSES)
      .default("registered")
      .notNull(),
    paymentStatus: mysqlEnum("payment_status", PAYMENT_STATUSES)
      .default("not_required")
      .notNull(),
    paidAt: datetime("paid_at"),
    /** Scanned at the entrance (member card QR code). */
    checkedInAt: datetime("checked_in_at", { fsp: 3 }),
    ...timestamps(),
  },
  (t) => [uniqueIndex("attendance_event_member_uq").on(t.eventId, t.memberId)],
);

/* -------------------------------------------------------------------------- */
/*                                 Predictions                                */
/* -------------------------------------------------------------------------- */

export const predictions = mysqlTable(
  "predictions",
  {
    id: id(),
    matchId: fk("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    memberId: fk("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    psgScore: int("psg_score").notNull(),
    opponentScore: int("opponent_score").notNull(),
    // Filled once the match is finished.
    points: int("points"),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("predictions_match_member_uq").on(t.matchId, t.memberId),
    index("predictions_member_idx").on(t.memberId),
  ],
);

/* -------------------------------------------------------------------------- */
/*                                 Newsletter                                 */
/* -------------------------------------------------------------------------- */

export const SUBSCRIBER_STATUSES = [
  "pending",
  "confirmed",
  "unsubscribed",
] as const;

export const subscribers = mysqlTable("subscribers", {
  id: id(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  locale: mysqlEnum("locale", LOCALES).default("fr").notNull(),
  status: mysqlEnum("status", SUBSCRIBER_STATUSES).default("pending").notNull(),
  confirmationToken: varchar("confirmation_token", { length: 64 }).unique(),
  consentedAt: datetime("consented_at"),
  ...timestamps(),
});

/* -------------------------------------------------------------------------- */
/*                                  Documents                                 */
/* -------------------------------------------------------------------------- */

export const DOCUMENT_VISIBILITIES = ["public", "members", "admins"] as const;

export const documents = mysqlTable(
  "documents",
  {
    id: id(),
    title: varchar("title", { length: 200 }).notNull(),
    filePath: varchar("file_path", { length: 512 }).notNull(),
    mimeType: varchar("mime_type", { length: 127 }).notNull(),
    sizeBytes: int("size_bytes", { unsigned: true }).notNull(),
    visibility: mysqlEnum("visibility", DOCUMENT_VISIBILITIES)
      .default("members")
      .notNull(),
    category: varchar("category", { length: 80 }),
    ...timestamps(),
  },
  (t) => [index("documents_visibility_idx").on(t.visibility)],
);

/* -------------------------------------------------------------------------- */
/*                                    Polls                                   */
/* -------------------------------------------------------------------------- */

export const POLL_STATUSES = ["draft", "open", "closed"] as const;

export const polls = mysqlTable("polls", {
  id: id(),
  question: varchar("question", { length: 255 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", POLL_STATUSES).default("draft").notNull(),
  opensAt: datetime("opens_at"),
  closesAt: datetime("closes_at"),
  ...timestamps(),
});

export const pollOptions = mysqlTable(
  "poll_options",
  {
    id: id(),
    pollId: fk("poll_id")
      .notNull()
      .references(() => polls.id, { onDelete: "cascade" }),
    label: varchar("label", { length: 255 }).notNull(),
    position: int("position").default(0).notNull(),
    ...timestamps(),
  },
  (t) => [index("poll_options_poll_idx").on(t.pollId)],
);

export const pollVotes = mysqlTable(
  "poll_votes",
  {
    id: id(),
    pollId: fk("poll_id")
      .notNull()
      .references(() => polls.id, { onDelete: "cascade" }),
    optionId: fk("option_id")
      .notNull()
      .references(() => pollOptions.id, { onDelete: "cascade" }),
    memberId: fk("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    ...timestamps(),
  },
  (t) => [uniqueIndex("poll_votes_poll_member_uq").on(t.pollId, t.memberId)],
);

/* -------------------------------------------------------------------------- */
/*                         Announcements (top banner)                         */
/* -------------------------------------------------------------------------- */

export const ANNOUNCEMENT_TONES = ["info", "maintenance", "urgent"] as const;

// EN/DE texts are optional and fall back to FR.
export const announcements = mysqlTable(
  "announcements",
  {
    id: id(),
    tone: mysqlEnum("tone", ANNOUNCEMENT_TONES).default("info").notNull(),
    titleFr: varchar("title_fr", { length: 80 }).notNull(),
    titleEn: varchar("title_en", { length: 80 }),
    titleDe: varchar("title_de", { length: 80 }),
    messageFr: varchar("message_fr", { length: 240 }).notNull(),
    messageEn: varchar("message_en", { length: 240 }),
    messageDe: varchar("message_de", { length: 240 }),
    linkUrl: varchar("link_url", { length: 512 }),
    active: boolean("active").default(false).notNull(),
    endsAt: datetime("ends_at"),
    createdById: fk("created_by_id").references(() => user.id, { onDelete: "set null" }),
    ...timestamps(),
  },
  (t) => [index("announcements_active_idx").on(t.active, t.updatedAt)],
);

/* -------------------------------------------------------------------------- */
/*                                  Audit log                                 */
/* -------------------------------------------------------------------------- */

// Append-only: no updatedAt on purpose.
export const auditLog = mysqlTable(
  "audit_log",
  {
    id: id(),
    actorId: fk("actor_id").references(() => user.id, {
      onDelete: "set null",
    }),
    action: varchar("action", { length: 100 }).notNull(),
    entityType: varchar("entity_type", { length: 60 }).notNull(),
    entityId: varchar("entity_id", { length: 36 }),
    metadata: json<Record<string, unknown>>("metadata"),
    ipAddress: varchar("ip_address", { length: 45 }),
    createdAt: createdAt(),
  },
  (t) => [
    index("audit_log_entity_idx").on(t.entityType, t.entityId),
    index("audit_log_actor_idx").on(t.actorId),
    index("audit_log_created_at_idx").on(t.createdAt),
  ],
);

/* -------------------------------------------------------------------------- */
/*                                   Avatars                                  */
/* -------------------------------------------------------------------------- */

const blob = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => "mediumblob" });

/** Profile photos, already resized to a 256 px WebP by the browser. */
export const avatars = mysqlTable("avatars", {
  userId: fk("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  data: blob("data").notNull(),
  updatedAt: dateTime3("updated_at").notNull(),
});

/** Images of the news articles, already resized to WebP by the browser. */
export const media = mysqlTable("media", {
  id: id(),
  data: blob("data").notNull(),
  contentType: varchar("content_type", { length: 32 }).notNull(),
  width: int("width").notNull(),
  height: int("height").notNull(),
  uploadedBy: fk("uploaded_by").references(() => user.id, { onDelete: "set null" }),
  createdAt: createdAt(),
});

/* -------------------------------------------------------------------------- */
/*                                   Mailing                                  */
/* -------------------------------------------------------------------------- */

/** Automated emails: one row per automation of the registry (src/lib/mailing/registry.ts). */
export const emailAutomations = mysqlTable("email_automations", {
  key: varchar("key", { length: 64 }).primaryKey(),
  enabled: boolean("enabled").default(true).notNull(),
  delayMinutes: int("delay_minutes").default(0).notNull(),
  updatedBy: fk("updated_by").references(() => user.id, { onDelete: "set null" }),
  updatedAt: updatedAt(),
});

export const EMAIL_OWNER_TYPES = ["automation", "campaign"] as const;

/** Texts edited by the committee; without a row, the defaults of messages/*.json apply. */
export const emailTemplates = mysqlTable(
  "email_templates",
  {
    id: id(),
    ownerType: mysqlEnum("owner_type", EMAIL_OWNER_TYPES).notNull(),
    ownerId: varchar("owner_id", { length: 64 }).notNull(),
    locale: mysqlEnum("locale", LOCALES).notNull(),
    subject: varchar("subject", { length: 200 }).notNull(),
    preview: varchar("preview", { length: 200 }).notNull(),
    heading: varchar("heading", { length: 200 }).notNull(),
    /** Safe inline syntax (**bold**, *italic*, [link](url)) and {variables}; never HTML. */
    body: text("body").notNull(),
    ctaLabel: varchar("cta_label", { length: 80 }),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("email_templates_owner_locale_uq").on(t.ownerType, t.ownerId, t.locale)],
);

export const CAMPAIGN_AUDIENCES = ["members", "paid", "unpaid", "pending", "event"] as const;
export const CAMPAIGN_STATUSES = ["draft", "scheduled", "sending", "sent"] as const;

/** Emails written by the committee and sent once to an audience. */
export const emailCampaigns = mysqlTable("email_campaigns", {
  id: id(),
  name: varchar("name", { length: 120 }).notNull(),
  audience: mysqlEnum("audience", CAMPAIGN_AUDIENCES).default("members").notNull(),
  audienceEventId: fk("audience_event_id").references(() => events.id, { onDelete: "set null" }),
  /** Button target (a page of the site or an external link); no button without it. */
  ctaUrl: varchar("cta_url", { length: 255 }),
  status: mysqlEnum("status", CAMPAIGN_STATUSES).default("draft").notNull(),
  scheduledAt: datetime("scheduled_at", { fsp: 3 }),
  sentCount: int("sent_count").default(0).notNull(),
  createdBy: fk("created_by").references(() => user.id, { onDelete: "set null" }),
  ...timestamps(),
});

export const EMAIL_JOB_STATUSES = ["pending", "sending", "sent", "failed", "skipped", "cancelled"] as const;
export type EmailJobStatus = (typeof EMAIL_JOB_STATUSES)[number];

/** Outbox: every automated or campaign email goes through here (sent by the mailing worker). */
export const emailJobs = mysqlTable(
  "email_jobs",
  {
    id: id(),
    automationKey: varchar("automation_key", { length: 64 }),
    campaignId: fk("campaign_id").references(() => emailCampaigns.id, { onDelete: "cascade" }),
    memberId: fk("member_id").references(() => members.id, { onDelete: "set null" }),
    toEmail: varchar("to_email", { length: 255 }).notNull(),
    locale: mysqlEnum("locale", LOCALES).default("fr").notNull(),
    /** Variables of the texts, the button link and the info line, fixed when queued. */
    payload: json<{ values: Record<string, string>; path?: string; url?: string; info?: string }>("payload").notNull(),
    /** Same key = same email: never queued twice (NULL for test sends). */
    dedupeKey: varchar("dedupe_key", { length: 191 }).unique(),
    status: mysqlEnum("status", EMAIL_JOB_STATUSES).default("pending").notNull(),
    sendAfter: datetime("send_after", { fsp: 3 }).notNull(),
    attempts: int("attempts").default(0).notNull(),
    lastError: varchar("last_error", { length: 500 }),
    sentAt: datetime("sent_at", { fsp: 3 }),
    createdAt: createdAt(),
  },
  (t) => [
    index("email_jobs_due_idx").on(t.status, t.sendAfter),
    index("email_jobs_automation_idx").on(t.automationKey),
    index("email_jobs_campaign_idx").on(t.campaignId),
  ],
);

/** Single row (id 1): pause switch and sending pace. */
export const mailingSettings = mysqlTable("mailing_settings", {
  id: int("id").primaryKey(),
  paused: boolean("paused").default(false).notNull(),
  /** Most emails per day (automations and campaigns together). */
  dailyCap: int("daily_cap").default(500).notNull(),
  /** Most emails per minute, to stay within the SMTP provider's limits. */
  perMinute: int("per_minute").default(20).notNull(),
  updatedAt: updatedAt(),
});
