import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins/magic-link";
import { createTranslator, hasLocale } from "next-intl";
import { createElement } from "react";
import { db } from "@/db";
import { ROLES, account, session, user, verification } from "@/db/schema";
import { MagicLinkEmail } from "@/emails/magic-link";
import { loadMessages } from "@/i18n/messages";
import { routing } from "@/i18n/routing";
import { sendMail } from "@/lib/mail";

const MAGIC_LINK_TTL_SECONDS = 10 * 60;

// The sign-in form sends a localized callbackURL (/fr/… or /de/…): reuse it for the email.
function localeFromMagicLink(url: string) {
  const callbackURL = new URL(url).searchParams.get("callbackURL") ?? "";
  const segment = callbackURL.split("/")[1];
  return hasLocale(routing.locales, segment) ? segment : routing.defaultLocale;
}

async function sendMagicLinkEmail(email: string, url: string) {
  const locale = localeFromMagicLink(url);
  const messages = await loadMessages(locale);
  const t = createTranslator({ locale, messages, namespace: "Emails.magicLink" });

  await sendMail({
    to: email,
    subject: t("subject"),
    react: createElement(MagicLinkEmail, {
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
    plugins: [
      magicLink({
        expiresIn: MAGIC_LINK_TTL_SECONDS,
        // A leaked database must not yield usable sign-in links.
        storeToken: "hashed",
        sendMagicLink: ({ email, url }) => sendMagicLinkEmail(email, url),
      }),
      // Must stay last: lets server actions set auth cookies.
      nextCookies(),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;
export type Session = Auth["$Infer"]["Session"];

let instance: Auth | undefined;

// Created on first use rather than at import time, so `next build` never needs the auth secrets.
export function getAuth(): Auth {
  return (instance ??= createAuth());
}
