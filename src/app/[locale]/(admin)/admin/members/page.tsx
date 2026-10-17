import { Users } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("AdminMembers");
  return { title: t("title"), robots: { index: false } };
}

/** Computer, nothing open yet: a quiet hint on the right (phones only see the list). */
export default async function MembersIndexPage() {
  const t = await getTranslations("AdminMembers");
  return (
    <div className="grid min-h-[50svh] place-items-center text-center">
      <div className="max-w-xs space-y-3">
        <Users className="mx-auto size-6 text-muted-foreground" aria-hidden />
        <p className="font-narrow text-[28px] leading-none font-extrabold uppercase italic">{t("pickTitle")}</p>
        <p className="text-sm text-pretty text-muted-foreground">{t("pickBody")}</p>
      </div>
    </div>
  );
}
