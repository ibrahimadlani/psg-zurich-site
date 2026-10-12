import { ViewTransition } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

/**
 * Full-height page with vertically centred content (coming soon, sign-in, 404).
 * `bare` drops the header, footer and announcement banner (sign-in screens, 404).
 */
export function BrandShell({ children, bare = false }: { children: React.ReactNode; bare?: boolean }) {
  return (
    <div
      data-bare-page={bare ? "" : undefined}
      className="relative flex flex-1 flex-col overflow-hidden leading-[normal]"
    >
      {bare ? null : <SiteHeader />}
      <main className="relative flex flex-1 flex-col items-center justify-center px-4 pt-6 pb-12">
        <ViewTransition default="page">{children}</ViewTransition>
      </main>
      {bare ? null : <SiteFooter />}
    </div>
  );
}
