import { z } from "zod";
import {
  ANNOUNCEMENT_TONES,
  DOCUMENT_VISIBILITIES,
  EVENT_TYPES,
  LOCALES,
  MATCH_STATUSES,
  MATCH_VENUES,
  MEMBER_STATUSES,
  POLL_STATUSES,
  POST_STATUSES,
} from "@/db/schema";

const text = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) => z.string().trim().max(max).optional();
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

export const createPostSchema = z.object({
  slug: z
    .string()
    .trim()
    .max(191)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, digits and dashes only."),
  locale: z.enum(LOCALES).default("fr"),
  title: text(255),
  excerpt: optionalText(500),
  content: z.string().min(1),
  imageUrl: z.url().max(512).optional(),
  status: z.enum(POST_STATUSES).default("draft"),
});

/* --------------------------------- Matches -------------------------------- */

export const createMatchSchema = z.object({
  opponent: text(120),
  competition: text(120),
  kickoffAt: dateTime,
  venue: z.enum(MATCH_VENUES),
  stadium: optionalText(160),
  psgScore: score,
  opponentScore: score,
  status: z.enum(MATCH_STATUSES).default("scheduled"),
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
    startsAt: dateTime,
    endsAt: dateTime.optional(),
    capacity: z.number().int().positive().optional(),
    priceCents: z.number().int().min(0).default(0),
    membersOnly: z.boolean().default(false),
  })
  .refine((event) => !event.endsAt || event.endsAt >= event.startsAt, {
    message: "endsAt must be after startsAt.",
    path: ["endsAt"],
  });

/* --------------------------------- Members -------------------------------- */

export const createMemberSchema = z.object({
  userId: z.uuid(),
  firstName: text(100),
  lastName: text(100),
  phone: optionalText(32),
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
  phone: z.string().trim().max(32),
  city: z.string().trim().max(100),
});

/** Committee decision on a membership request (PATCH /api/v1/members/[id]). */
export const memberDecisionSchema = z.object({
  decision: z.enum(["approve", "reject"]),
});

/** Name or remove an admin (superadmin only; superadmin itself is never set here). */
export const roleChangeSchema = z.object({
  email: z.email().max(255).transform((email) => email.toLowerCase()),
  role: z.enum(["member", "admin"]),
});

/* ------------------------------- Subscribers ------------------------------ */

export const createSubscriberSchema = z.object({
  email: z.email().max(255).transform((email) => email.toLowerCase()),
  locale: z.enum(LOCALES).default("fr"),
});

/* -------------------------------- Documents ------------------------------- */

export const createDocumentSchema = z.object({
  title: text(200),
  filePath: text(512),
  mimeType: text(127),
  sizeBytes: z.number().int().min(0),
  visibility: z.enum(DOCUMENT_VISIBILITIES).default("members"),
  category: optionalText(80),
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
  phone: optionalText(32),
  city: optionalText(100),
  password: z.string().min(8).max(128),
  acceptTerms: z.literal(true),
  // Language of the confirmation email and of the page its link leads to.
  locale: z.enum(LOCALES).default("fr"),
  // Honeypot: hidden from people, filled in by robots.
  website: z.string().max(200).optional(),
});

