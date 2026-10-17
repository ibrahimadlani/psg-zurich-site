import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { TemplateEditor } from "@/components/mailing/template-editor";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { automationMessageKey, defaultTemplates, requireMailingAdmin, savedTemplates } from "@/lib/mailing/admin-data";
import { automation } from "@/lib/mailing/registry";
import { AdminSkeleton } from "@/components/skeletons";

// Automation keys are known at runtime only here: rendered at request time.
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Mailing");
  return { title: t("title"), robots: { index: false } };
}

async function Editor({ params }: { params: Promise<{ key: string }> }) {
  await connection();
  const t = await getTranslations("Mailing");
  if (!(await requireMailingAdmin())) return <p className="text-destructive">{t("error")}</p>;
  const { key } = await params;
  const definition = automation(key);
  if (!definition) notFound();
  const name = automationMessageKey(key);
  const [saved, defaults] = await Promise.all([savedTemplates("automation", key), defaultTemplates(key)]);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{t(`automations.${name}.name` as never)}</h1>
          <Badge variant="outline">{t(`categories.${definition.category}`)}</Badge>
        </div>
        <p className="text-muted-foreground">{t(`automations.${name}.when` as never)}</p>
      </header>
      <TemplateEditor ownerType="automation" ownerId={key} saved={saved} defaults={defaults} variables={definition.variables} />
    </div>
  );
}

export default async function AutomationPage({ params }: PageProps<"/[locale]/admin/mailing/automations/[key]">) {
  const t = await getTranslations("Mailing");
  return (
    <>
      <Link href="/admin/mailing" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" aria-hidden />
        {t("back")}
      </Link>
      <Suspense fallback={<AdminSkeleton cards={2} />}>
        <Editor params={params} />
      </Suspense>
    </>
  );
}
