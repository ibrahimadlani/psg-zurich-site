import { z } from "zod";
import {
  ANNOUNCEMENT_TONES,
  EVENT_TYPES,
  LOCALES,
  MATCH_STATUSES,
  MATCH_VENUES,
  MEMBER_INTERESTS,
  MEMBER_STATUSES,
  POLL_STATUSES,
  POST_CATEGORIES,
  POST_STATUSES,
  EMAIL_OWNER_TYPES,
  PSG_TICKETING,
} from "@/db/schema";
import { blocksSchema } from "@/lib/article-blocks";
import { ageOn, todayInZurich } from "@/lib/dues";
import { mapsEnabled } from "@/lib/google-maps";
import { normalizePhone } from "@/lib/phone";

const text = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) => z.string().trim().max(max).optional();
/**
 * Optional phone number: empty, or valid for its country (CH and neighbours), stored in
 * E.164 ("+41791234567").
 */
const phone = z
  .string()
  .trim()
  .max(32)
  .refine((value) => value === "" || normalizePhone(value) !== null, { message: "invalid_phone" })
  .transform((value) => (value === "" ? "" : normalizePhone(value)!));
const dateTime = z.iso.datetime({ offset: true }).transform((value) => new Date(value));
const score = z.number().int().min(0).max(99).optional();

export const pagination = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

/* ---------------------------------- Posts --------------------------------- */

export const postsQuery = pagination.extend({
  locale: z.enum(LOCALES).optional(),
});

/** Article from the CMS (create and full update). */
export const createPostSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(191)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, digits and dashes only."),
  locale: z.enum(LOCALES).default("fr"),
  title: text(255),
  excerpt: optionalText(500),
  category: z.enum(POST_CATEGORIES).default("club"),
  byline: optionalText(80),
  /** Cover: /api/v1/media/<id> (or an absolute https URL). */
  imageUrl: z
    .string()
    .max(512)
    .regex(/^(\/api\/v1\/media\/[\w-]+|https:\/\/\S+)$/)
    .optional(),
  blocks: blocksSchema,
  /** Post id this one translates (sets the translation group). */
  translationOf: z.uuid().optional(),
  status: z.enum(POST_STATUSES).default("draft"),
  /** Publication date; in the future = scheduled. Defaults to now when published. */
  publishedAt: z.iso.datetime({ offset: true }).transform((value) => new Date(value)).optional(),
});

/* --------------------------------- Matches -------------------------------- */

/**
 * Match entered by hand (competitions the football-data.org plan doesn't cover: Coupe de France,
 * Trophée des champions, friendlies). psgScore / opponentScore = final score (extra time included);
 * regulation* = score after 90 minutes when the match went to extra time (otherwise the final score).
 */
export const createMatchSchema = z
  .object({
    opponent: text(120),
    opponentLogo: z.url().max(255).optional(),
    competition: text(120),
    round: optionalText(80),
    kickoffAt: dateTime,
    venue: z.enum(MATCH_VENUES),
    stadium: optionalText(160),
    city: optionalText(120),
    status: z.enum(MATCH_STATUSES).default("scheduled"),
    psgScore: score,
    opponentScore: score,
    regulationPsgScore: score,
    regulationOpponentScore: score,
    penaltyPsgScore: score,
    penaltyOpponentScore: score,
  })
  .refine((match) => match.status !== "finished" || (match.psgScore !== undefined && match.opponentScore !== undefined), {
    message: "A finished match needs its score.",
    path: ["psgScore"],
  });

/** A member's prediction: score after 90 minutes. */
export const predictionSchema = z.object({
  psgScore: z.number().int().min(0).max(20),
  opponentScore: z.number().int().min(0).max(20),
});

/* --------------------------------- Events --------------------------------- */

export const createEventSchema = z
  .object({
    type: z.enum(EVENT_TYPES),
    title: text(200),
    description: optionalText(10_000),
    matchId: z.uuid().optional(),
    location: optionalText(255),
    /** Picked from the Google address suggestions; the coordinates place the pin. */
    address: optionalText(255),
    placeId: optionalText(255),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    startsAt: dateTime,
    endsAt: dateTime.optional(),
    capacity: z.number().int().positive().optional(),
    priceCents: z.number().int().min(0).default(0),
    membersOnly: z.boolean().default(false),
    /** Email the members about it (creation only). */
    notifyMembers: z.boolean().default(false),
  })
  .refine((event) => !event.endsAt || event.endsAt >= event.startsAt, {
    message: "endsAt must be after startsAt.",
    path: ["endsAt"],
  })
  // Every event has its pin on the map (when Google Maps is set up).
  .refine((event) => !mapsEnabled || (event.address && event.latitude !== undefined && event.longitude !== undefined), {
    message: "address must be picked from the suggestions.",
    path: ["address"],
  });

/* --------------------------------- Members -------------------------------- */

export const createMemberSchema = z.object({
  userId: z.uuid(),
  firstName: text(100),
  lastName: text(100),
  phone: phone.optional(),
  city: optionalText(100),
  memberNumber: optionalText(20),
  status: z.enum(MEMBER_STATUSES).default("pending"),
  joinedOn: z.iso.date().optional(),
  expiresOn: z.iso.date().optional(),
});

/** Member editing their own profile (PATCH /api/v1/me). */
export const profileUpdateSchema = z.object({
  firstName: text(100),
  lastName: text(100),
  phone,
  address: z.string().trim().max(255).default(""),
  postcode: z.string().trim().max(10).default(""),
  city: z.string().trim().max(100),
});

/**
 * Member profile asked at onboarding and editable in the settings (any subset): birth date
 * ("" clears it), interests, PSG ticketing access, photo consent (null clears the answer).
 */
export const memberProfileFields = {
  birthDate: z.union([
    z.iso.date().refine((value) => {
      const today = todayInZurich();
      return value >= "1900-01-01" && value <= today && ageOn(value, today) >= 6;
    }, "Not a plausible birth date."),
    z.literal(""),
  ]),
  interests: z
    .array(z.enum(MEMBER_INTERESTS))
    .max(MEMBER_INTERESTS.length)
    .transform((values) => [...new Set(values)]),
  psgTicketing: z.enum(PSG_TICKETING).nullable(),
  photoConsent: z.boolean().nullable(),
};

/**
 * Welcome steps (POST /api/v1/me/onboarding): each step saves what it has (empty contact
 * fields keep what is there); `done` ends the flow (finished or skipped).
 */
export const onboardingSchema = z
  .object({
    phone: phone,
    address: z.string().trim().max(255),
    postcode: z.string().trim().max(10),
    city: z.string().trim().max(100),
    ...memberProfileFields,
  })
  .partial()
  .extend({ done: z.boolean().default(false) });

/** Member settings (PATCH /api/v1/me/settings): any subset of the fields. */
export const memberSettingsSchema = z
  .object({
    // Letters, digits, spaces, dots, dashes and underscores; empty string clears it.
    nickname: z.union([
      z
        .string()
        .trim()
        .min(3)
        .max(32)
        .regex(/^[\p{L}\p{N} ._-]+$/u),
      z.literal(""),
    ]),
    locale: z.enum(LOCALES),
    hideFromLeaderboard: z.boolean(),
    notifyEvents: z.boolean(),
    notifyPredictionReminders: z.boolean(),
    notifyResults: z.boolean(),
    notifyNews: z.boolean(),
    ...memberProfileFields,
  })
  .partial();

/**
 * What the committee does to a member (PATCH /api/v1/members/[id]): decide on a request
 * (accepting may record the fee at once; a refusal may carry an internal reason), suspend or
 * reinstate, or correct the member's details.
 */
export const memberDecisionSchema = z.object({
  decision: z.enum(["approve", "reject"]),
  withDues: z.boolean().default(false),
  reason: z.string().trim().max(500).default(""),
});
export const memberStatusActionSchema = z.object({ action: z.enum(["suspend", "reactivate"]) });
export const memberAdminEditSchema = z.object({
  profile: z.object({
    firstName: text(100),
    lastName: text(100),
    phone,
    address: z.string().trim().max(255),
    postcode: z.string().trim().max(10),
    city: z.string().trim().max(100),
    birthDate: memberProfileFields.birthDate,
    locale: z.enum(LOCALES),
  }),
});
export const memberAdminSchema = z.union([memberDecisionSchema, memberStatusActionSchema, memberAdminEditSchema]);

/** Several members at once (fees, reminders, export): ids from the admin list. */
export const memberIdsSchema = z.object({ ids: z.array(z.string().min(1).max(36)).min(1).max(1000) });

/** Name or remove an admin or moderator (superadmin only; superadmin itself is never set here). */
export const roleChangeSchema = z.object({
  email: z.email().max(255).transform((email) => email.toLowerCase()),
  role: z.enum(["member", "moderator", "admin"]),
});

/* ------------------------------- Subscribers ------------------------------ */

export const createSubscriberSchema = z.object({
  email: z.email().max(255).transform((email) => email.toLowerCase()),
  locale: z.enum(LOCALES).default("fr"),
});

/* ---------------------------------- Polls --------------------------------- */

export const createPollSchema = z.object({
  question: text(255),
  description: optionalText(5_000),
  status: z.enum(POLL_STATUSES).default("draft"),
  opensAt: dateTime.optional(),
  closesAt: dateTime.optional(),
  options: z.array(text(255)).min(2).max(20),
});

/* ------------------------------ Announcements ----------------------------- */

const optionalLocalized = (max: number) =>
  z.string().trim().max(max).optional().transform((value) => value || null);

export const announcementSchema = z.object({
  tone: z.enum(ANNOUNCEMENT_TONES).default("info"),
  titleFr: text(80),
  titleEn: optionalLocalized(80),
  titleDe: optionalLocalized(80),
  messageFr: text(240),
  messageEn: optionalLocalized(240),
  messageDe: optionalLocalized(240),
  linkUrl: z.union([z.url().max(512), z.literal("")]).optional().transform((value) => value || null),
  active: z.boolean().default(true),
  endsAt: z.union([dateTime, z.literal("")]).optional().transform((value) => value || null),
});

export const announcementPatchSchema = z.object({ active: z.boolean() });

/* ------------------------------- Membership ------------------------------- */

export const membershipSignupSchema = z.object({
  firstName: text(100),
  lastName: text(100),
  email: z.email().max(255).transform((email) => email.toLowerCase()),
  phone: phone.optional(),
  address: optionalText(255),
  postcode: optionalText(10),
  city: optionalText(100),
  password: z.string().min(8).max(128),
  acceptTerms: z.literal(true),
  // Language of the confirmation email and of the page its link leads to.
  locale: z.enum(LOCALES).default("fr"),
  // Honeypot: hidden from people, filled in by robots.
  website: z.string().max(200).optional(),
  // Page the visitor wanted before joining (`?suite=`): the welcome step ends there. Checked
  // with safeReturnPath before use.
  // The checked `?suite=` of the page, or null when there is none.
  next: z.string().max(512).nullish(),
});


/* --------------------------------- Mailing -------------------------------- */

/** Preview or test send of an email being edited in the admin. */
export const mailPreviewSchema = z.object({
  ownerType: z.enum(EMAIL_OWNER_TYPES),
  ownerId: z.string().min(1).max(64),
  locale: z.enum(LOCALES),
  draft: z
    .object({
      subject: z.string().max(200),
      preview: z.string().max(200),
      heading: z.string().max(200),
      body: z.string().max(10_000),
      ctaLabel: z.string().max(80).optional(),
    })
    .optional(),
});
