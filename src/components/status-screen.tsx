import { BareTopBar } from "@/components/bare-top-bar";
import { NotFoundHero } from "@/components/not-found-hero";

/** The explanation under the title of a status screen. */
export const statusBodyClass =
  "max-w-[26rem] text-[15px] leading-normal text-pretty text-muted-foreground";

/**
 * The one layout of the site's status pages (404, 500): the slim bar of the sign-in screens
 * (the full header may be what failed), the oversized code, a title, a few words and the way out.
 * No announcement banner (`data-bare-page`).
 */
export function StatusScreen({
  code,
  title,
  children,
}: {
  code: string;
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      data-bare-page=""
      className="relative flex flex-1 flex-col overflow-hidden leading-[normal]"
    >
      <title>{`${code} · PSG Zurich`}</title>
      <BareTopBar />
      <main className="relative flex flex-1 flex-col items-center justify-center px-4 pt-6 pb-12">
        <div className="flex w-full animate-page-in flex-col items-center motion-reduce:animate-none">
          <NotFoundHero code={code} title={title}>
            {children}
          </NotFoundHero>
        </div>
      </main>
    </div>
  );
}
