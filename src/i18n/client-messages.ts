import { getMessages } from "next-intl/server";

/**
 * The part of the catalogue a page sends to the browser. Server components read theirs on the
 * server; sending everything would put hundreds of kilobytes in front of every page's content.
 * The lists are in client-namespaces.ts, kept up to date by scripts/client-messages.mjs.
 */
export async function clientMessages(namespaces: readonly string[]) {
  const messages = await getMessages();
  return Object.fromEntries(namespaces.map((name) => [name, messages[name as keyof typeof messages]])) as typeof messages;
}
