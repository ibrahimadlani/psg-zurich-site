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
] as const;

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
    city: varchar("city", { length: 100 }),
    memberNumber: varchar("member_number", { length: 20 }).unique(),
    status: mysqlEnum("status", MEMBER_STATUSES).default("pending").notNull(),
    joinedOn: date("joined_on", { mode: "string" }),
    expiresOn: date("expires_on", { mode: "string" }),
    ...timestamps(),
  },
  (t) => [index("members_status_idx").on(t.status)],
);

/* -------------------------------------------------------------------------- */
/*                                    Blog                                    */
/* -------------------------------------------------------------------------- */

export const POST_STATUSES = ["draft", "published"] as const;

export const posts = mysqlTable(
  "posts",
  {
    id: id(),
    slug: varchar("slug", { length: 191 }).notNull().unique(),
    locale: mysqlEnum("locale", LOCALES).default("fr").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    excerpt: varchar("excerpt", { length: 500 }),
    content: mediumtext("content").notNull(),
    imageUrl: varchar("image_url", { length: 512 }),
    status: mysqlEnum("status", POST_STATUSES).default("draft").notNull(),
    publishedAt: datetime("published_at"),
    authorId: fk("author_id").references(() => user.id, {
      onDelete: "set null",
    }),
    ...timestamps(),
  },
  (t) => [index("posts_listing_idx").on(t.status, t.locale, t.publishedAt)],
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

export const matches = mysqlTable(
  "matches",
  {
    id: id(),
    opponent: varchar("opponent", { length: 120 }).notNull(),
    competition: varchar("competition", { length: 120 }).notNull(),
    kickoffAt: datetime("kickoff_at").notNull(),
    venue: mysqlEnum("venue", MATCH_VENUES).notNull(),
    stadium: varchar("stadium", { length: 160 }),
    psgScore: int("psg_score"),
    opponentScore: int("opponent_score"),
    status: mysqlEnum("status", MATCH_STATUSES).default("scheduled").notNull(),
    ...timestamps(),
  },
  (t) => [index("matches_kickoff_idx").on(t.kickoffAt)],
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
    location: varchar("location", { length: 255 }),
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
  (t) => [uniqueIndex("predictions_match_member_uq").on(t.matchId, t.memberId)],
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
