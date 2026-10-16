"use client";

import type { ComponentProps } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { signInHref } from "@/lib/return-to";

/**
 * Link to the sign-in page that brings the visitor back afterwards: to `next` when given (a
 * login wall knows the page it guards), else to the page they are on. From the home page or
 * the visitor pages, nothing is carried and signing in leads to the member area.
 */
export function SignInLink({ next, ...props }: Omit<ComponentProps<typeof Link>, "href"> & { next?: string | null }) {
  const pathname = usePathname();
  return <Link prefetch={false} {...props} href={signInHref(next === undefined ? pathname : next)} />;
}
