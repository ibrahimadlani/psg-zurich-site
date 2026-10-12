import { desc } from "drizzle-orm";
import { ArrowLeft, Plus } from "lucide-react";
import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import { posts } from "@/db/schema";
import { Link } from "@/i18n/navigation";
import { postState, requireCmsAccess } from "@/lib/cms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Cms");
  return { title: t("title"), robots: { index: false } };
}

async function PostList() {
  await connection();
  const t = await getTranslations("Cms");
  const tNews = await getTranslations("News");
  const format = await getFormatter();
  if (!(await requireCmsAccess())) return <p className="text-destructive">{t("forbidden")}</p>;

  const rows = await db.select().from(posts).orderBy(desc(posts.updatedAt));

  return rows.length ? (
    <ul className="divide-y overflow-hidden rounded-[14px] border bg-card/70">
      {rows.map((post) => {
        const state = postState(post);
        return (
          <li key={post.id}>
            <Link href={`/admin/actualites/${post.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3.5 transition-colors hover:bg-foreground/[0.03]">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{post.title}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {tNews(`categories.${post.category}`)} · {post.locale.toUpperCase()} · {t("updated", { date: format.relativeTime(post.updatedAt) })}
                </span>
              </span>
              <Badge variant={state === "published" ? "default" : state === "scheduled" ? "secondary" : "outline"}>
                {state === "scheduled" && post.publishedAt
                  ? t("scheduledFor", { date: format.dateTime(post.publishedAt, { dateStyle: "medium", timeStyle: "short" }) })
                  : t(`states.${state}`)}
              </Badge>
            </Link>
          </li>
        );
      })}
    </ul>
  ) : (
    <p className="rounded-[14px] border border-dashed p-8 text-center text-sm text-muted-foreground">{t("empty")}</p>
  );
}

export default async function CmsListPage() {
  const t = await getTranslations("Cms");
  return (
    <div className="space-y-6">
      <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" aria-hidden />
        {t("backToAdmin")}
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        <Button asChild>
          <Link href="/admin/actualites/nouveau" prefetch={false}>
            <Plus aria-hidden />
            {t("new")}
          </Link>
        </Button>
      </div>
      <Suspense fallback={<p className="text-muted-foreground">…</p>}>
        <PostList />
      </Suspense>
    </div>
  );
}
