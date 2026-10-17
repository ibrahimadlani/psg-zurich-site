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
// Order = MySQL enum order: append only (the rank is in lib/roles.ts).
export const ROLES = ["member", "admin", "superadmin", "moderator"] as const;
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

/** What a member enjoys doing with the club (asked at onboarding, for events and emails). */
export const MEMBER_INTERESTS = ["watch_party", "home_trips", "away_trips", "members_match", "social"] as const;
export type MemberInterest = (typeof MEMBER_INTERESTS)[number];
/** Access to PSG tickets, for group purchases on trips. Order = MySQL enum order: append only. */
export const PSG_TICKETING = ["season_ticket", "myparis_premium", "myparis", "none"] as const;

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
    /** Role in the committee ("Président", "Trésorière"…), shown on the contact page when set. */
    committeeTitle: varchar("committee_title", { length: 60 }),
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
    /** Statutes: under 18 = junior member (reduced fee, legal guardian's consent). Never shown to other members. */
    birthDate: date("birth_date", { mode: "string" }),
    interests: json<MemberInterest[]>("interests"),
    psgTicketing: mysqlEnum("psg_ticketing", PSG_TICKETING),
    /** Club photos (site, social media): null = no answer, treated as a no. */
    photoConsent: boolean("photo_consent"),
    /** When the photo answer was last given (proof of consent). */
    photoConsentAt: datetime("photo_consent_at", { fsp: 3 }),
    /** Welcome steps done or skipped (asked once after signing up). */
    onboardedAt: datetime("onboarded_at", { fsp: 3 }),
    /** Last time the member opened the notification bell: newer items count as unread. */
    notificationsSeenAt: datetime("notifications_seen_at", { fsp: 3 }),
    /** "Clear all" in the bell: items up to this moment are no longer shown. */
    notificationsClearedAt: datetime("notifications_cleared_at", { fsp: 3 }),
    /** Items removed one by one from the bell (their feed ids, the most recent ones only). */
    notificationsDismissed: json<string[]>("notifications_dismissed"),
    /** Payment customer of the member (saved card for one-tap payments). */
    stripeCustomerId: varchar("stripe_customer_id", { length: 64 }).unique(),
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

/** Match officials as the API lists them (referee, assistants, fourth official, VAR). */
export type MatchOfficial = { name: string; type: string; nationality: string | null };

export const matches = mysqlTable(
  "matches",
  {
    id: id(),
    /** Match id at football-data.org; null for matches entered by hand. */
    externalId: int("external_id").unique(),
    /** Season start year (2026 = 2026/27). */
    season: int("season"),
    opponent: varchar("opponent", { length: 120 }).notNull(),
    /** Opponent's team id at football-data.org (table and head-to-head lookups). */
    opponentExternalId: int("opponent_external_id"),
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
    officials: json<MatchOfficial[]>("officials"),
    /** Final score, extra time included. */
    psgScore: int("psg_score"),
    opponentScore: int("opponent_score"),
    /** Score after 90 minutes: the one predictions are scored against. */
    regulationPsgScore: int("regulation_psg_score"),
    regulationOpponentScore: int("regulation_opponent_score"),
    halfTimePsgScore: int("half_time_psg_score"),
    halfTimeOpponentScore: int("half_time_opponent_score"),
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

/**
 * A prediction season once closed (1 July, for the season that ended on 30 June): its table is
 * frozen in `prediction_standings` and no longer moves. `season` is the starting year
 * (2026 = 2026-2027, like the club and fee seasons).
 */
export const predictionSeasons = mysqlTable("prediction_seasons", {
  season: int("season").primaryKey(),
  closedAt: dateTime3("closed_at").notNull(),
});

/** Final table of a closed season, one row per ranked member; the top 3 are rewarded. */
export const predictionStandings = mysqlTable(
  "prediction_standings",
  {
    id: id(),
    season: int("season")
      .notNull()
      .references(() => predictionSeasons.season, { onDelete: "cascade" }),
    memberId: fk("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    rank: int("rank").notNull(),
    points: int("points").notNull(),
    exact: int("exact").notNull(),
    played: int("played").notNull(),
    /** When the committee handed over the prize (podium only). */
    rewardGivenAt: dateTime3("reward_given_at"),
  },
  (t) => [
    uniqueIndex("prediction_standings_season_member_uq").on(t.season, t.memberId),
    index("prediction_standings_member_idx").on(t.memberId),
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

/**
 * The file of a club document (statutes, minutes…), kept in the database like the article
 * images so it survives redeploys. 10 MB at most (checked by the upload route).
 */
export const documentFiles = mysqlTable("document_files", {
  documentId: fk("document_id")
    .primaryKey()
    .references(() => documents.id, { onDelete: "cascade" }),
  data: blob("data").notNull(),
});

/**
 * Driving time from a member's home to an event (Google Routes API), so each pair is paid for
 * once. Keyed by a hash of the two places: no address is stored here.
 */
export const routeTimes = mysqlTable("route_times", {
  key: varchar("key", { length: 64 }).primaryKey(),
  durationSeconds: int("duration_seconds").notNull(),
  distanceMeters: int("distance_meters").notNull(),
  computedAt: createdAt(),
});

/* -------------------------------------------------------------------------- */
/*                                   Contact                                  */
/* -------------------------------------------------------------------------- */

// Order = MySQL enum order: append only.
export const CONTACT_TOPICS = ["join", "events", "fees", "partnership", "website", "account", "other"] as const;
export type ContactTopic = (typeof CONTACT_TOPICS)[number];
/** new: nobody opened it · open: being handled · answered: waiting for the sender · closed · spam. */
export const CONTACT_STATUSES = ["new", "open", "answered", "closed", "spam"] as const;
export type ContactStatus = (typeof CONTACT_STATUSES)[number];
export const CONTACT_AUTHORS = ["contact", "committee", "note"] as const;

/** A conversation started from the contact page, by a visitor or a member. */
export const contactThreads = mysqlTable(
  "contact_threads",
  {
    id: id(),
    /** Shown as "C-0042" to the sender and in the admin. */
    reference: int("reference").notNull().unique(),
    topic: mysqlEnum("topic", CONTACT_TOPICS).notNull(),
    status: mysqlEnum("status", CONTACT_STATUSES).default("new").notNull(),
    /** Set when a member wrote; the conversation goes with their account. */
    memberId: fk("member_id").references(() => members.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    locale: mysqlEnum("locale", LOCALES).default("fr").notNull(),
    organisation: varchar("organisation", { length: 160 }),
    /** Website problems only: the page concerned and the browser. */
    context: json<{ page?: string; userAgent?: string }>("context"),
    assignedToId: fk("assigned_to_id").references(() => user.id, { onDelete: "set null" }),
    /** sha256 of the visitor's private follow-up link. */
    trackingTokenHash: varchar("tracking_token_hash", { length: 64 }).unique(),
    lastMessageAt: dateTime3("last_message_at").notNull(),
    firstReplyAt: dateTime3("first_reply_at"),
    /** Last "waiting for an answer" reminder to the committee. */
    remindedAt: dateTime3("reminded_at"),
    /** When the sender last opened the conversation: committee replies after it are new to them. */
    senderSeenAt: dateTime3("sender_seen_at"),
    ...timestamps(),
  },
  (t) => [
    index("contact_threads_status_idx").on(t.status, t.lastMessageAt),
    index("contact_threads_email_idx").on(t.email),
    index("contact_threads_member_idx").on(t.memberId),
  ],
);

/** The messages of a conversation; "note" ones are internal to the committee. */
export const contactMessages = mysqlTable(
  "contact_messages",
  {
    id: id(),
    threadId: fk("thread_id")
      .notNull()
      .references(() => contactThreads.id, { onDelete: "cascade" }),
    author: mysqlEnum("author", CONTACT_AUTHORS).notNull(),
    authorUserId: fk("author_user_id").references(() => user.id, { onDelete: "set null" }),
    body: text("body").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("contact_messages_thread_idx").on(t.threadId, t.createdAt)],
);

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
    payload: json<{ values: Record<string, string>; path?: string; url?: string; info?: string; quote?: string; replyTo?: string; event?: { type: string; startsAt: string }; attachment?: string }>("payload").notNull(),
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

/* -------------------------------------------------------------------------- */
/*                         Payments and the club's books                      */
/* -------------------------------------------------------------------------- */

/*
 * Every franc that comes in or goes out leaves a trace here. A payment row is created when a
 * checkout starts and settles once the payment provider confirms it (webhook) or the committee
 * records a manual payment. The ledger is append-only: a correction is a reversing entry.
 * Amounts are integer centimes, in CHF.
 */

// Order = MySQL enum order: append only.
export const PAYMENT_KINDS = ["dues", "shop", "donation"] as const;
export type PaymentKind = (typeof PAYMENT_KINDS)[number];
export const PAYMENT_STATES = ["pending", "processing", "succeeded", "failed", "canceled", "refunded", "partially_refunded"] as const;
export type PaymentState = (typeof PAYMENT_STATES)[number];
export const PAYMENT_METHODS = ["card", "twint", "apple_pay", "google_pay", "bank_transfer", "cash", "twint_manual"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export const PAYMENT_ITEM_TYPES = ["dues", "product", "shipping", "donation"] as const;
export const LEDGER_ACCOUNTS = ["dues", "shop", "shipping", "donations", "refunds", "stripe_fees", "payouts"] as const;
export type LedgerAccount = (typeof LEDGER_ACCOUNTS)[number];
export const REFUND_STATES = ["pending", "succeeded", "failed"] as const;
export const ORDER_FULFILMENTS = ["pickup", "shipping"] as const;
// "pending": checkout started, not paid yet (append only: MySQL enum order).
export const ORDER_STATUSES = ["paid", "ready", "handed_over", "shipped", "canceled", "pending"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const payments = mysqlTable(
  "payments",
  {
    id: id(),
    /** Shown to the payer and the committee: P-000123. */
    reference: int("reference").notNull().unique(),
    kind: mysqlEnum("kind", PAYMENT_KINDS).notNull(),
    status: mysqlEnum("status", PAYMENT_STATES).default("pending").notNull(),
    amount: int("amount").notNull(),
    currency: varchar("currency", { length: 3 }).default("CHF").notNull(),
    /** Provider fee and what reaches the bank, once known. */
    feeAmount: int("fee_amount"),
    netAmount: int("net_amount"),
    refundedAmount: int("refunded_amount").default(0).notNull(),
    method: mysqlEnum("method", PAYMENT_METHODS),
    /** Payer as at the payment: the receipt stays readable after the account is gone. */
    memberId: fk("member_id").references(() => members.id, { onDelete: "set null" }),
    payerName: varchar("payer_name", { length: 200 }).notNull(),
    payerEmail: varchar("payer_email", { length: 255 }).notNull(),
    locale: mysqlEnum("locale", LOCALES).default("fr").notNull(),
    /** Donations: a word for the club, and whether the name may be shown. */
    message: varchar("message", { length: 500 }),
    anonymous: boolean("anonymous").default(false).notNull(),
    stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 64 }).unique(),
    stripeChargeId: varchar("stripe_charge_id", { length: 64 }),
    cardBrand: varchar("card_brand", { length: 20 }),
    cardLast4: varchar("card_last4", { length: 4 }),
    /** Receipt number (Q-2026-0001), given only once the money is in. */
    receiptNumber: varchar("receipt_number", { length: 20 }).unique(),
    paidAt: dateTime3("paid_at"),
    payoutId: fk("payout_id"),
    /** Committee member who recorded a manual payment. */
    createdById: fk("created_by_id").references(() => user.id, { onDelete: "set null" }),
    note: varchar("note", { length: 500 }),
    ipAddress: varchar("ip_address", { length: 45 }),
    ...timestamps(),
  },
  (t) => [
    index("payments_status_idx").on(t.status, t.createdAt),
    index("payments_member_idx").on(t.memberId),
    index("payments_kind_paid_idx").on(t.kind, t.paidAt),
  ],
);

/** What a payment pays for, frozen at checkout (prices, names, season). */
export const paymentItems = mysqlTable(
  "payment_items",
  {
    id: id(),
    paymentId: fk("payment_id")
      .notNull()
      .references(() => payments.id, { onDelete: "cascade" }),
    type: mysqlEnum("type", PAYMENT_ITEM_TYPES).notNull(),
    description: varchar("description", { length: 255 }).notNull(),
    quantity: int("quantity").default(1).notNull(),
    unitAmount: int("unit_amount").notNull(),
    total: int("total").notNull(),
    /** Fee: the season paid for ("2026/27"). */
    season: varchar("season", { length: 9 }),
    variantId: fk("variant_id"),
  },
  (t) => [index("payment_items_payment_idx").on(t.paymentId)],
);

export const refunds = mysqlTable(
  "refunds",
  {
    id: id(),
    paymentId: fk("payment_id")
      .notNull()
      .references(() => payments.id, { onDelete: "restrict" }),
    amount: int("amount").notNull(),
    reason: varchar("reason", { length: 500 }).notNull(),
    status: mysqlEnum("status", REFUND_STATES).default("pending").notNull(),
    /** Credit note number (A-2026-0001), given once the refund went through. */
    creditNoteNumber: varchar("credit_note_number", { length: 20 }).unique(),
    stripeRefundId: varchar("stripe_refund_id", { length: 64 }).unique(),
    createdById: fk("created_by_id").references(() => user.id, { onDelete: "set null" }),
    ...timestamps(),
  },
  (t) => [index("refunds_payment_idx").on(t.paymentId)],
);

/** The club's journal: append-only, one signed amount per line. */
export const ledgerEntries = mysqlTable(
  "ledger_entries",
  {
    id: id(),
    /** Accounting date (Zurich), and the club's financial year it belongs to ("2026/27"). */
    date: date("date", { mode: "string" }).notNull(),
    fiscalYear: varchar("fiscal_year", { length: 9 }).notNull(),
    account: mysqlEnum("account", LEDGER_ACCOUNTS).notNull(),
    amount: int("amount").notNull(),
    description: varchar("description", { length: 255 }).notNull(),
    paymentId: fk("payment_id").references(() => payments.id, { onDelete: "restrict" }),
    refundId: fk("refund_id").references(() => refunds.id, { onDelete: "restrict" }),
    payoutId: fk("payout_id"),
    createdAt: createdAt(),
  },
  (t) => [
    index("ledger_year_idx").on(t.fiscalYear, t.date),
    index("ledger_payment_idx").on(t.paymentId),
  ],
);

/** Transfers from the payment provider to the club's bank account. */
export const stripePayouts = mysqlTable("stripe_payouts", {
  id: id(),
  stripePayoutId: varchar("stripe_payout_id", { length: 64 }).notNull().unique(),
  amount: int("amount").notNull(),
  fees: int("fees").default(0).notNull(),
  arrivalDate: date("arrival_date", { mode: "string" }).notNull(),
  status: varchar("status", { length: 20 }).notNull(),
  ...timestamps(),
});

/** Every notification received from the payment provider: processed once, kept as proof. */
export const stripeEvents = mysqlTable(
  "stripe_events",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    type: varchar("type", { length: 80 }).notNull(),
    payload: json<Record<string, unknown>>("payload").notNull(),
    receivedAt: createdAt(),
    processedAt: dateTime3("processed_at"),
    attempts: int("attempts").default(0).notNull(),
    error: varchar("error", { length: 500 }),
  },
  (t) => [index("stripe_events_pending_idx").on(t.processedAt)],
);

/** Gapless numbering of receipts (Q) and credit notes (A), per calendar year. */
export const documentNumbers = mysqlTable(
  "document_numbers",
  {
    series: varchar("series", { length: 2 }).notNull(),
    year: int("year").notNull(),
    last: int("last").default(0).notNull(),
  },
  (t) => [uniqueIndex("document_numbers_uq").on(t.series, t.year)],
);

/** Receipts and credit notes as issued: the PDF is frozen, with its fingerprint. */
export const receipts = mysqlTable("receipts", {
  number: varchar("number", { length: 20 }).primaryKey(),
  paymentId: fk("payment_id").references(() => payments.id, { onDelete: "restrict" }),
  refundId: fk("refund_id").references(() => refunds.id, { onDelete: "restrict" }),
  pdf: blob("pdf").notNull(),
  sha256: varchar("sha256", { length: 64 }).notNull(),
  issuedAt: createdAt(),
});

/** Membership fee of each season, as voted by the general assembly. */
export const duesRates = mysqlTable("dues_rates", {
  season: varchar("season", { length: 9 }).primaryKey(),
  adultAmount: int("adult_amount").notNull(),
  juniorAmount: int("junior_amount").notNull(),
  setById: fk("set_by_id").references(() => user.id, { onDelete: "set null" }),
  ...timestamps(),
});

/* Shop ------------------------------------------------------------------------ */

export const products = mysqlTable("products", {
  id: id(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  name: json<Record<Locale, string>>("name").notNull(),
  description: json<Record<Locale, string>>("description").notNull(),
  price: int("price").notNull(),
  /** Article images (media ids), first one on the grid. */
  images: json<string[]>("images").notNull(),
  active: boolean("active").default(false).notNull(),
  sortOrder: int("sort_order").default(0).notNull(),
  ...timestamps(),
});

export const productVariants = mysqlTable(
  "product_variants",
  {
    id: id(),
    productId: fk("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    /** "M", "XL", "Unique"… */
    label: varchar("label", { length: 40 }).notNull(),
    sku: varchar("sku", { length: 60 }),
    stock: int("stock").default(0).notNull(),
    /** Set aside by checkouts in progress (stock_holds). */
    held: int("held").default(0).notNull(),
    sortOrder: int("sort_order").default(0).notNull(),
  },
  (t) => [index("product_variants_product_idx").on(t.productId)],
);

/** Pieces set aside while a checkout is paid; released when it fails or expires. */
export const stockHolds = mysqlTable(
  "stock_holds",
  {
    id: id(),
    variantId: fk("variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    paymentId: fk("payment_id")
      .notNull()
      .references(() => payments.id, { onDelete: "cascade" }),
    quantity: int("quantity").notNull(),
    expiresAt: dateTime3("expires_at").notNull(),
  },
  (t) => [index("stock_holds_payment_idx").on(t.paymentId), index("stock_holds_expiry_idx").on(t.expiresAt)],
);

export const orders = mysqlTable(
  "orders",
  {
    id: id(),
    paymentId: fk("payment_id")
      .notNull()
      .unique()
      .references(() => payments.id, { onDelete: "restrict" }),
    memberId: fk("member_id").references(() => members.id, { onDelete: "set null" }),
    fulfilment: mysqlEnum("fulfilment", ORDER_FULFILMENTS).notNull(),
    /** Shipping: the address as given at checkout. */
    shippingAddress: json<{ name: string; street: string; postcode: string; city: string; country: "CH" }>("shipping_address"),
    status: mysqlEnum("status", ORDER_STATUSES).default("pending").notNull(),
    trackingNumber: varchar("tracking_number", { length: 80 }),
    handedOverAt: dateTime3("handed_over_at"),
    handedOverById: fk("handed_over_by_id").references(() => user.id, { onDelete: "set null" }),
    ...timestamps(),
  },
  (t) => [index("orders_status_idx").on(t.status), index("orders_member_idx").on(t.memberId)],
);

/** Single row (id 1): shop options. */
export const shopSettings = mysqlTable("shop_settings", {
  id: int("id").primaryKey(),
  /** Flat postage within Switzerland, in centimes. */
  shippingFee: int("shipping_fee").default(900).notNull(),
  shippingEnabled: boolean("shipping_enabled").default(true).notNull(),
  updatedAt: updatedAt(),
});

/* -------------------------------------------------------------------------- */
/*                                Site settings                               */
/* -------------------------------------------------------------------------- */

// Order = MySQL enum order: append only.
export const HOME_VISITOR_VARIANTS = ["coming_soon", "matchday", "journal", "club"] as const;
export type HomeVisitorVariant = (typeof HOME_VISITOR_VARIANTS)[number];
export const HOME_MEMBER_VARIANTS = ["dashboard", "feed", "matchday"] as const;
export type HomeMemberVariant = (typeof HOME_MEMBER_VARIANTS)[number];

/** Single row (id 1): which home page visitors and signed-in members get. */
export const siteSettings = mysqlTable("site_settings", {
  id: int("id").primaryKey(),
  homeVisitor: mysqlEnum("home_visitor", HOME_VISITOR_VARIANTS).default("coming_soon").notNull(),
  homeMember: mysqlEnum("home_member", HOME_MEMBER_VARIANTS).default("dashboard").notNull(),
  updatedById: fk("updated_by_id").references(() => user.id, { onDelete: "set null" }),
  updatedAt: updatedAt(),
});
