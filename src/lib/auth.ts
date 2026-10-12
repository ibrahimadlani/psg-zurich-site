import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { createTranslator, hasLocale } from "next-intl";
import { createElement } from "react";
import { db } from "@/db";
import { ROLES, account, session, user, verification } from "@/db/schema";
import { AuthLinkEmail } from "@/emails/auth-link";
import { loadMessages } from "@/i18n/messages";
import { routing } from "@/i18n/routing";
import { sendMail } from "@/lib/mail";
import { notifyNewMembershipRequest } from "@/lib/membership-mail";

const RESET_PASSWORD_TTL_SECONDS = 60 * 60;
const VERIFY_EMAIL_TTL_SECONDS = 60 * 60 * 24;

// The forms send a localized redirect URL (/fr/…, /en/…, /de/…): reuse it for the email.
function localeFromAuthUrl(url: string) {
  const callbackURL = new URL(url).searchParams.get("callbackURL") ?? "";
  const segment = decodeURIComponent(callbackURL).split("/")[1];
  return hasLocale(routing.locales, segment) ? segment : routing.defaultLocale;
}

async function sendAuthLinkEmail(kind: "resetPassword" | "verifyEmail", email: string, link: string) {
  // Links built during a direct auth.api call lack the origin and the /api/auth base path
  // when BETTER_AUTH_URL is empty (local dev).
  const url = link.startsWith("/") ? new URL(`/api/auth${link}`, "http://localhost:3000").href : link;
  const locale = localeFromAuthUrl(url);
  const messages = await loadMessages(locale);
  const t = createTranslator({ locale, messages, namespace: `Emails.${kind}` });

  await sendMail({
    to: email,
    subject: t("subject"),
    react: createElement(AuthLinkEmail, {
      url,
      locale,
      texts: {
        preview: t("preview"),
        heading: t("heading"),
        body: t("body"),
        cta: t("cta"),
        ignore: t("ignore"),
      },
    }),
  });
}

function createAuth() {
  return betterAuth({
    appName: "PSG Zurich",
    // BETTER_AUTH_URL and BETTER_AUTH_SECRET are read from the environment.
    database: drizzleAdapter(db, {
      provider: "mysql",
      schema: { user, session, account, verification },
    }),
    advanced: {
      database: { generateId: "uuid" },
    },
    user: {
      additionalFields: {
        role: {
          type: [...ROLES],
          required: true,
          defaultValue: "member",
          // Never settable by the client: promotions go through the admin API / database.
          input: false,
        },
      },
    },
    emailAndPassword: {
      enabled: true,
      // Sign-up only happens server-side in the membership flow (/api/v1/membership):
      // the public HTTP endpoint is disabled below.
      disableSignUp: false,
      // New accounts sign in only once their address is confirmed (link sent at sign-up).
      requireEmailVerification: true,
      resetPasswordTokenExpiresIn: RESET_PASSWORD_TTL_SECONDS,
      revokeSessionsOnPasswordReset: true,
      // Also lets accounts without a password yet set one.
      sendResetPassword: ({ user, url }) => sendAuthLinkEmail("resetPassword", user.email, url),
    },
    emailVerification: {
      sendOnSignUp: true,
      // A sign-in attempt on an unconfirmed account sends a fresh link.
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
      expiresIn: VERIFY_EMAIL_TTL_SECONDS,
      sendVerificationEmail: ({ user, url }) => sendAuthLinkEmail("verifyEmail", user.email, url),
      // The committee hears about a membership request once the address is confirmed.
      afterEmailVerification: async (user) => {
        await notifyNewMembershipRequest(user.id).catch((error) =>
          console.error("[membership] request notification failed:", error),
        );
      },
    },
    disabledPaths: ["/sign-up/email"],
    // Must stay last: lets server actions set auth cookies.
    plugins: [nextCookies()],
  });
}

export type Auth = ReturnType<typeof createAuth>;
export type Session = Auth["$Infer"]["Session"];

let instance: Auth | undefined;

// Created on first use rather than at import time, so `next build` never needs the auth secrets.
export function getAuth(): Auth {
  return (instance ??= createAuth());
}
