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

const RESET_PASSWORD_TTL_SECONDS = 60 * 60;

// The forms send a localized redirect URL (/fr/…, /en/…, /de/…): reuse it for the email.
function localeFromAuthUrl(url: string) {
  const callbackURL = new URL(url).searchParams.get("callbackURL") ?? "";
  const segment = decodeURIComponent(callbackURL).split("/")[1];
  return hasLocale(routing.locales, segment) ? segment : routing.defaultLocale;
}

async function sendResetPasswordEmail(email: string, url: string) {
  const locale = localeFromAuthUrl(url);
  const messages = await loadMessages(locale);
  const t = createTranslator({ locale, messages, namespace: "Emails.resetPassword" });

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
      // Accounts are created through the membership flow, not by public sign-up.
      disableSignUp: true,
      resetPasswordTokenExpiresIn: RESET_PASSWORD_TTL_SECONDS,
      revokeSessionsOnPasswordReset: true,
      // Also lets accounts without a password yet set one.
      sendResetPassword: ({ user, url }) => sendResetPasswordEmail(user.email, url),
    },
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
