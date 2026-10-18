"use client";

import { useSelectedLayoutSegment } from "next/navigation";

/**
 * The site's content area: every page at the content width, except the home page, which sets
 * its own (the landing runs edge to edge). One frame for all, so the header and footer stay
 * put from one page to the next, home included.
 */
export function SiteMain({ children }: { children: React.ReactNode }) {
  const home = useSelectedLayoutSegment() === null;
  return <main className={home ? "w-full flex-1" : "mx-auto w-full max-w-5xl flex-1 px-4 py-10"}>{children}</main>;
}
