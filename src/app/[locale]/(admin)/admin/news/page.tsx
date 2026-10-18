import { desc } from "drizzle-orm";
import { Plus } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { PostsList, type PostGroup, type PostRow } from "@/components/admin/news/posts-list";
import { db } from "@/db";
import { posts } from "@/db/schema";
import { Link } from "@/i18n/navigation";
import { postState, requireCmsAccess } from "@/lib/cms";
import { AdminSkeleton } from "@/components/skeletons";
import { AdminHeader } from "@/components/admin/ui/admin-header";
import { adminButton } from "@/components/admin/ui/styles";
import { Streamed } from "@/components/ui/skeleton";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Cms");
  return { title: t("title"), robots: { index: false } };
}

/** Articles grouped with their translations (the original first), latest change first. */
async function PostList() {
  await connection();
  const t = await getTranslations("Cms");
  if (!(await requireCmsAccess())) return <p className="text-destructive">{t("forbidden")}</p>;

  const rows = await db.select().from(posts).orderBy(desc(posts.updatedAt));
  const groups = new Map<string, PostGroup>();
  for (const post of rows) {
    const key = post.translationGroup ?? post.id;
    const row: PostRow = {
      id: post.id,
      title: post.title,
      locale: post.locale,
      category: post.category,
      state: postState(post),
      publishedAt: post.publishedAt,
      updatedAt: post.updatedAt,
      imageUrl: post.imageUrl,
    };
    const group = groups.get(key) ?? { id: key, original: row, versions: {} };
    // Two versions in one language (rare): the most recently changed one shows.
    group.versions[post.locale] ??= row;
    if (post.id === key) group.original = row;
    groups.set(key, group);
  }
  return <PostsList groups={[...groups.values()]} />;
}

export default async function CmsListPage() {
  const t = await getTranslations("Cms");
  return (
    <>
      <AdminHeader
        title={t("title")}
        description={t("description")}
        actions={
          <Link href="/admin/news/new" prefetch={false} className={adminButton("primary")}>
            <Plus aria-hidden />
            {t("new")}
          </Link>
        }
      />
      <Streamed fallback={<AdminSkeleton cards={1} />}>
        <PostList />
      </Streamed>
    </>
  );
}
