import { BareTopBar } from "@/components/bare-top-bar";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

/**
 * Full-height page with vertically centred content (coming soon, sign-in, 404).
 * `bare` drops the header, footer and announcement banner (sign-in screens, 404);
 * `homeBar` then adds the slim logo + "back to home" bar (sign-in screens).
 */
export function BrandShell({
  children,
  bare = false,
  homeBar = false,
}: {
  children: React.ReactNode;
  bare?: boolean;
  homeBar?: boolean;
}) {
  return (
    <div
      data-bare-page={bare ? "" : undefined}
      className="relative flex flex-1 flex-col overflow-hidden leading-[normal]"
    >
      {bare ? homeBar ? <BareTopBar /> : null : <SiteHeader />}
      <main className="relative flex flex-1 flex-col items-center justify-center px-4 pt-6 pb-12">
        <div className="flex w-full animate-page-in flex-col items-center motion-reduce:animate-none">
          {children}
        </div>
      </main>
      {bare ? null : <SiteFooter />}
    </div>
  );
}
