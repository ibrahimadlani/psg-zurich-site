import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { Suspense } from "react";
import { PostEditor } from "@/components/cms/post-editor";
import type { Locale } from "@/db/schema";
import { Link } from "@/i18n/navigation";
import { editorData, requireCmsAccess } from "@/lib/cms";
import { AdminSkeleton } from "@/components/skeletons";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Cms");
  return { title: t("new"), robots: { index: false } };
}

async function NewPost() {
  await connection();
  const t = await getTranslations("Cms");
  if (!(await requireCmsAccess())) return <p className="text-destructive">{t("forbidden")}</p>;
  const data = await editorData();
  return (
    <PostEditor
      initial={{
        title: "",
        excerpt: "",
        slug: "",
        category: "club",
        locale: (await getLocale()) as Locale,
        translationOf: "",
        byline: "",
        imageUrl: "",
        blocks: [{ type: "paragraph", text: "" }],
        mode: "draft",
        publishAt: "",
      }}
      originals={data.originals}
      matches={data.matches}
      events={data.events}
      refs={data.refs}
    />
  );
}

export default async function NewPostPage() {
  const t = await getTranslations("Cms");
  return (
    <div className="space-y-4">
      <Link href="/admin/actualites" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" aria-hidden />
        {t("title")}
      </Link>
      <Suspense fallback={<AdminSkeleton cards={1} />}>
        <NewPost />
      </Suspense>
    </div>
  );
}
