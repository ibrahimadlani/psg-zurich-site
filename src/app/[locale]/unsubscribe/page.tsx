import { BellOff } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { inlineLinkClass, submitClass } from "@/components/auth/auth-ui";
import { BrandShell } from "@/components/brand-shell";
import { Link } from "@/i18n/navigation";
import { NOTIFICATION_TYPES, verifyUnsubscribe } from "@/lib/unsubscribe";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Unsubscribe");
  return { title: t("title"), robots: { index: false } };
}

const heading = "font-narrow text-[length:clamp(32px,6vw,44px)] leading-[0.95] font-extrabold uppercase italic";

async function Content({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const t = await getTranslations("Unsubscribe");
  const locale = await getLocale();
  const params = await searchParams;
  const one = (name: string) => (typeof params[name] === "string" ? (params[name] as string) : "");
  const done = one("done");
  const [memberId, type, signature] = [one("m"), one("t"), one("s")];
  const valid = verifyUnsubscribe(memberId, type, signature);

  if ((NOTIFICATION_TYPES as readonly string[]).includes(done)) {
    return (
      <div className="flex w-full max-w-[380px] animate-page-in flex-col items-center gap-5 text-center motion-reduce:animate-none">
        <span className="grid size-12 place-items-center rounded-full border border-psg-blue/25 text-psg-blue dark:border-foreground/25 dark:text-foreground">
          <BellOff className="size-5" strokeWidth={1.75} aria-hidden />
        </span>
        <h1 className={heading}>{t("doneTitle")}</h1>
        <p className="text-[15px] text-pretty text-muted-foreground">{t(`done.${done as "events" | "reminders"}`)}</p>
        <Link href="/settings/notifications" className={`text-[14px] ${inlineLinkClass}`}>
          {t("manage")}
        </Link>
      </div>
    );
  }

  if (!valid) {
    return (
      <div className="flex max-w-[380px] flex-col items-center gap-4 text-center">
        <h1 className={heading}>{t("invalidTitle")}</h1>
        <p className="text-[15px] text-muted-foreground">{t("invalid")}</p>
        <Link href="/settings/notifications" className={`text-[14px] ${inlineLinkClass}`}>
          {t("manage")}
        </Link>
      </div>
    );
  }

  return (
    <form method="post" action="/api/unsubscribe" className="flex w-full max-w-[380px] flex-col items-center gap-5 text-center">
      <h1 className={heading}>{t("title")}</h1>
      <p className="text-[15px] text-pretty text-muted-foreground">{t(`confirm.${type}`)}</p>
      <input type="hidden" name="m" value={memberId} />
      <input type="hidden" name="t" value={type} />
      <input type="hidden" name="s" value={signature} />
      <input type="hidden" name="l" value={locale} />
      <button type="submit" className={`${submitClass} w-full`}>
        {t("submit")}
      </button>
    </form>
  );
}

/** Confirmation page of the email unsubscribe links (no sign-in needed). */
export default function UnsubscribePage({ searchParams }: PageProps<"/[locale]/unsubscribe">) {
  return (
    <BrandShell bare homeBar>
      <Suspense>
        <Content searchParams={searchParams} />
      </Suspense>
    </BrandShell>
  );
}
