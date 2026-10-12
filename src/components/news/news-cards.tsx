import { ArrowRight } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import type { Post } from "@/lib/news";
import { cn } from "@/lib/utils";

/** Cover, or the site's diagonal lines with the crest when the article has none. */
export function NewsCover({ post, className, priority = false }: { post: Post; className?: string; priority?: boolean }) {
  return (
    <div className={cn("relative overflow-hidden bg-card", className)}>
      {post.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- uploaded media, already resized
        <img
          src={post.imageUrl}
          alt=""
          loading={priority ? "eager" : "lazy"}
          className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      ) : (
        <div className="grid size-full place-items-center bg-diagonal">
          <Image src="/brand/psg-crest.svg" alt="" width={56} height={56} className="size-14 opacity-25" />
        </div>
      )}
    </div>
  );
}

function useMeta(post: Post) {
  const t = useTranslations("News");
  const format = useFormatter();
  const date = post.publishedAt ? format.dateTime(post.publishedAt, { day: "numeric", month: "short", year: "numeric" }) : "";
  return `${t(`categories.${post.category}`)} · ${date}`;
}

const meta = "font-wide text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase";

/** Grid card: 3:2 cover, category · date, title, two-line excerpt. */
export function NewsCard({ post, withExcerpt = true }: { post: Post; withExcerpt?: boolean }) {
  const line = useMeta(post);
  return (
    <article className="min-w-0">
      <Link href={`/actualites/${post.slug}`} className="group flex flex-col gap-3.5">
        <NewsCover post={post} className="aspect-[3/2] rounded-[12px]" />
        <span className="flex flex-col gap-2">
          <span className={meta}>{line}</span>
          <span className="text-[19px] leading-tight font-semibold text-balance transition-colors group-hover:text-psg-blue dark:group-hover:text-foreground/80">
            {post.title}
          </span>
          {withExcerpt && post.excerpt ? (
            <span className="line-clamp-2 text-sm leading-normal text-muted-foreground">{post.excerpt}</span>
          ) : null}
        </span>
      </Link>
    </article>
  );
}

/** "Latest" article: large 16:10 cover beside the title and excerpt (stacked on phones). */
export function FeaturedNews({ post }: { post: Post }) {
  const t = useTranslations("News");
  const line = useMeta(post);
  return (
    <article className="border-b pb-[clamp(28px,4vw,40px)]">
      <Link
        href={`/actualites/${post.slug}`}
        className="group grid grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))] items-center gap-[clamp(20px,4vw,40px)]"
      >
        <NewsCover post={post} priority className="aspect-[16/10] rounded-[14px]" />
        <span className="flex flex-col items-start gap-3.5">
          <span className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex h-[22px] items-center rounded-full bg-psg-red px-[9px] font-wide text-[9px] font-semibold tracking-[0.08em] text-white uppercase">
              {t("latest")}
            </span>
            <span className={meta}>{line}</span>
          </span>
          <span className="text-[length:clamp(26px,3.6vw,36px)] leading-[1.12] font-semibold tracking-[-0.01em] text-balance">
            {post.title}
          </span>
          {post.excerpt ? <span className="text-base leading-relaxed text-pretty text-muted-foreground">{post.excerpt}</span> : null}
          <span className="mt-1.5 inline-flex items-center gap-2 border-b border-psg-red pb-[3px] text-sm">
            {t("read")}
            <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </span>
        </span>
      </Link>
    </article>
  );
}
