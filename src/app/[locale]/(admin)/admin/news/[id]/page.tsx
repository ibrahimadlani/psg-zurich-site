import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { PostEditor } from "@/components/cms/post-editor";
import { Link } from "@/i18n/navigation";
import { editorData, loadPost, postState, requireCmsAccess, toLocalInput } from "@/lib/cms";
import { AdminSkeleton } from "@/components/skeletons";

// Post ids only exist at runtime.
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Cms");
  return { title: t("editTitle"), robots: { index: false } };
}

async function EditPost({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const t = await getTranslations("Cms");
  if (!(await requireCmsAccess())) return <p className="text-destructive">{t("forbidden")}</p>;
  const { id } = await params;
  const found = await loadPost(id);
  if (!found) notFound();
  const { post, blocks } = found;
  const data = await editorData(post.id);
  const scheduled = postState(post) === "scheduled";
  const isTranslation = post.translationGroup !== null && post.translationGroup !== post.id;

  return (
    <PostEditor
      postId={post.id}
      initial={{
        title: post.title,
        excerpt: post.excerpt ?? "",
        slug: post.slug,
        category: post.category,
        locale: post.locale,
        translationOf: isTranslation ? (post.translationGroup ?? "") : "",
        byline: post.byline ?? "",
        imageUrl: post.imageUrl ?? "",
        blocks,
        mode: post.status === "draft" ? "draft" : scheduled ? "schedule" : "publish",
        publishAt: scheduled ? toLocalInput(post.publishedAt) : "",
      }}
      originals={data.originals}
      matches={data.matches}
      events={data.events}
      refs={data.refs}
      publicUrl={post.status === "published" && !scheduled ? `/${await getLocale()}/news/${post.slug}` : undefined}
    />
  );
}

export default async function EditPostPage({ params }: PageProps<"/[locale]/admin/news/[id]">) {
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
      <Suspense fallback={<AdminSkeleton cards={1} />}>
        <EditPost params={params} />
      </Suspense>
    </div>
  );
}
