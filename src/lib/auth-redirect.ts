import "server-only";
import { getLocale } from "next-intl/server";
import { headers } from "next/headers";
import { redirect } from "@/i18n/navigation";
import { RETURN_PATH_HEADER, safeReturnPath, signInHref } from "@/lib/return-to";

/** The page being rendered (path and query), as the visitor asked for it. */
export async function currentPath() {
  return safeReturnPath((await headers()).get(RETURN_PATH_HEADER));
}

/** Login wall: to the sign-in page, then back to this page (or `path`) once signed in. */
export async function redirectToSignIn(path?: string | null): Promise<never> {
  const [next, locale] = await Promise.all([path === undefined ? currentPath() : path, getLocale()]);
  return redirect({ href: signInHref(next), locale });
}
