import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { PostEditor } from "@/components/cms/post-editor";
import { LOCALES, type Locale } from "@/db/schema";
import { Link } from "@/i18n/navigation";
import { editorData, loadPost, requireCmsAccess } from "@/lib/cms";
import { AdminSkeleton } from "@/components/skeletons";
import { Streamed } from "@/components/ui/skeleton";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Cms");
  return { title: t("new"), robots: { index: false } };
}

async function NewPost({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const t = await getTranslations("Cms");
  if (!(await requireCmsAccess())) return <p className="text-destructive">{t("forbidden")}</p>;
  const data = await editorData();
  // From the list's "+ DE": a translation of that article, in that language, same category.
  const { traduction, langue } = await searchParams;
  const original = typeof traduction === "string" ? await loadPost(traduction) : null;
  const locale = typeof langue === "string" && (LOCALES as readonly string[]).includes(langue) ? (langue as Locale) : ((await getLocale()) as Locale);
  return (
    <PostEditor
      initial={{
        title: "",
        excerpt: "",
        slug: "",
        category: original?.post.category ?? "club",
        locale,
        translationOf: original ? (original.post.translationGroup ?? original.post.id) : "",
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

export default async function NewPostPage({ searchParams }: PageProps<"/[locale]/admin/news/new">) {
  const t = await getTranslations("Cms");
  return (
    <div className="space-y-4">
      <Link
        href="/admin/news"
        className="inline-flex items-center gap-2 font-wide text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3" aria-hidden />
        {t("title")}
      </Link>
      <Streamed fallback={<AdminSkeleton cards={1} />}>
        <NewPost searchParams={searchParams} />
      </Streamed>
    </div>
  );
}
