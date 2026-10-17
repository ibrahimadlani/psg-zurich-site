"use client";

import { Eye, PenLine, SlidersHorizontal, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { useConfirm } from "@/components/admin/ui/confirm-dialog";
import { ResponsivePanel, useIsDesktop } from "@/components/admin/ui/responsive-panel";
import { adminButton } from "@/components/admin/ui/styles";
import { BlockEditor, withKey, type KeyedBlock, type Option } from "@/components/cms/block-editor";
import { ArticleBody, type BlockRefs } from "@/components/news/article-body";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LOCALES, POST_CATEGORIES, type Locale, type PostCategory } from "@/db/schema";
import { useRouter } from "@/i18n/navigation";
import type { Block } from "@/lib/article-blocks";
import { uploadMedia } from "@/lib/image-resize";
import { cn } from "@/lib/utils";

export type PostDraft = {
  title: string;
  excerpt: string;
  slug: string;
  category: PostCategory;
  locale: Locale;
  translationOf: string;
  byline: string;
  imageUrl: string;
  blocks: Block[];
  /** draft · published now · scheduled (publishedAt in the future). */
  mode: "draft" | "publish" | "schedule";
  /** datetime-local, in the admin's time zone. */
  publishAt: string;
};

/** "Assemblée générale : un nouveau comité" → "assemblee-generale-un-nouveau-comite" */
export const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);

const select =
  "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
const panel = "space-y-4 rounded-[14px] border bg-card/70 p-4";

export function PostEditor({
  postId,
  initial,
  originals,
  matches,
  events,
  refs,
  publicUrl,
}: {
  postId?: string;
  initial: PostDraft;
  /** Articles this one can translate. */
  originals: Option[];
  matches: Option[];
  events: Option[];
  /** Data for the preview of match / event blocks. */
  refs: BlockRefs;
  publicUrl?: string;
}) {
  const t = useTranslations("Cms");
  const tNews = useTranslations("News");
  const router = useRouter();
  const ask = useConfirm();
  const desktop = useIsDesktop();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draft, setDraft] = useState(initial);
  const [blocks, setBlocks] = useState<KeyedBlock[]>(() => initial.blocks.map(withKey));
  const [slugEdited, setSlugEdited] = useState(Boolean(postId));
  const [saved, setSaved] = useState(() => JSON.stringify(initial));
  const [preview, setPreview] = useState(false);
  const [pending, startTransition] = useTransition();
  const [coverBusy, setCoverBusy] = useState(false);
  const coverInput = useRef<HTMLInputElement>(null);

  const current = useMemo(() => ({ ...draft, blocks: blocks.map((item) => item.block) }), [draft, blocks]);
  const dirty = JSON.stringify(current) !== saved;

  // Leaving with unsaved changes asks first.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = <K extends keyof PostDraft>(key: K, value: PostDraft[K]) => setDraft((previous) => ({ ...previous, [key]: value }));

  const save = () =>
    startTransition(async () => {
      // "Publish": the server keeps the original date of an already published article.
      const publishedAt = current.mode === "schedule" && current.publishAt ? new Date(current.publishAt).toISOString() : undefined;
      const response = await fetch(postId ? `/api/v1/posts/${postId}` : "/api/v1/posts", {
        method: postId ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: current.title,
          excerpt: current.excerpt || undefined,
          slug: current.slug || slugify(current.title),
          category: current.category,
          locale: current.locale,
          translationOf: current.translationOf || undefined,
          byline: current.byline || undefined,
          imageUrl: current.imageUrl || undefined,
          // Unfinished blocks (no image picked, no match chosen…) are left out.
          blocks: current.blocks.filter(isComplete),
          status: current.mode === "draft" ? "draft" : "published",
          publishedAt,
        }),
      });
      const body = (await response.json().catch(() => null)) as { data?: { id: string }; error?: { code: string } } | null;
      if (!response.ok) {
        toast.error(body?.error?.code === "conflict" ? t("slugTaken") : t("saveError"));
        return;
      }
      setSaved(JSON.stringify(current));
      toast.success(current.mode === "draft" ? t("savedDraft") : current.mode === "schedule" ? t("savedScheduled") : t("savedPublished"));
      if (!postId && body?.data) router.replace(`/admin/news/${body.data.id}`);
      else router.refresh();
    });

  const remove = async () => {
    if (!postId || (await ask({ title: t("delete"), body: t("confirmDelete"), confirmLabel: t("delete"), tone: "danger" })) === null) return;
    startTransition(async () => {
      const response = await fetch(`/api/v1/posts/${postId}`, { method: "DELETE" });
      if (!response.ok) {
        toast.error(t("deleteError"));
        return;
      }
      toast.success(t("deleted"));
      setSaved(JSON.stringify(current));
      router.replace("/admin/news");
    });
  };

  const uploadCover = async (file: File) => {
    setCoverBusy(true);
    try {
      const media = await uploadMedia(file, 1600);
      set("imageUrl", media.url);
    } catch {
      toast.error(t("uploadError"));
    } finally {
      setCoverBusy(false);
    }
  };

  const canSave = current.title.trim().length > 0 && (current.mode !== "schedule" || current.publishAt !== "");

  // Publication, category, language, cover: beside the text on a computer, in a panel on a phone.
  const settings = (
    <>
            <div className={panel}>
              <p className="text-sm font-semibold">{t("publication")}</p>
              <div className="grid grid-cols-3 gap-1 rounded-lg border p-0.5 text-xs">
                {(["draft", "publish", "schedule"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => set("mode", mode)}
                    className={cn("cursor-pointer rounded-md px-2 py-1.5", current.mode === mode ? "bg-segment text-segment-foreground" : "text-muted-foreground")}
                  >
                    {t(`modes.${mode}`)}
                  </button>
                ))}
              </div>
              {current.mode === "schedule" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="publish-at">{t("publishAt")}</Label>
                  <Input id="publish-at" type="datetime-local" value={current.publishAt} onChange={(event) => set("publishAt", event.target.value)} />
                </div>
              ) : null}
            </div>

            <div className={panel}>
              <div className="space-y-1.5">
                <Label htmlFor="category">{t("category")}</Label>
                <select id="category" className={select} value={current.category} onChange={(event) => set("category", event.target.value as PostCategory)}>
                  {POST_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {tNews(`categories.${category}`)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="locale">{t("language")}</Label>
                <select id="locale" className={select} value={current.locale} onChange={(event) => set("locale", event.target.value as Locale)}>
                  {LOCALES.map((locale) => (
                    <option key={locale} value={locale}>
                      {t(`languages.${locale}`)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="translation-of">{t("translationOf")}</Label>
                <select id="translation-of" className={select} value={current.translationOf} onChange={(event) => set("translationOf", event.target.value)}>
                  <option value="">{t("original")}</option>
                  {originals.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="byline">{t("byline")}</Label>
                <Input id="byline" value={current.byline} maxLength={80} placeholder={tNews("defaultByline")} onChange={(event) => set("byline", event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="slug">{t("slug")}</Label>
                <Input
                  id="slug"
                  value={current.slug}
                  maxLength={191}
                  onChange={(event) => {
                    setSlugEdited(true);
                    set("slug", slugify(event.target.value));
                  }}
                />
                <p className="truncate text-xs text-muted-foreground">/news/{current.slug || "…"}</p>
              </div>
            </div>

            <div className={panel}>
              <p className="text-sm font-semibold">{t("cover")}</p>
              {current.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- uploaded media
                <img src={current.imageUrl} alt="" className="aspect-[16/10] w-full rounded-lg object-cover" />
              ) : (
                <div className="grid aspect-[16/10] place-items-center rounded-lg bg-diagonal text-xs text-muted-foreground">{t("noCover")}</div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" disabled={coverBusy} onClick={() => coverInput.current?.click()}>
                  {coverBusy ? t("uploading") : current.imageUrl ? t("replaceCover") : t("chooseCover")}
                </Button>
                {current.imageUrl ? (
                  <Button type="button" variant="ghost" size="sm" onClick={() => set("imageUrl", "")}>
                    {t("removeCover")}
                  </Button>
                ) : null}
              </div>
              <input
                ref={coverInput}
                type="file"
                accept="image/*"
                className="sr-only"
                tabIndex={-1}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) void uploadCover(file);
                }}
              />
            </div>

            {postId ? (
              <Button type="button" variant="ghost" className="w-full text-destructive hover:text-destructive" onClick={remove}>
                <Trash2 aria-hidden />
                {t("delete")}
              </Button>
            ) : null}
    </>
  );

  return (
    <div className="space-y-6">
      {/* Sticky action bar: edit / preview, save state, save. */}
      <div className="sticky top-14 z-20 -mx-4 flex items-center gap-2 border-b bg-background/85 px-4 py-3 backdrop-blur sm:-mx-6 sm:gap-3 sm:px-6 lg:top-0 lg:-mx-10 lg:px-10">
        <div className="inline-flex rounded-lg border p-0.5 text-sm">
          {[
            { value: false, icon: PenLine, label: t("edit") },
            { value: true, icon: Eye, label: t("preview") },
          ].map(({ value, icon: Icon, label }) => (
            <button
              key={label}
              type="button"
              onClick={() => setPreview(value)}
              className={cn(
                "inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1.5 sm:px-3",
                preview === value ? "bg-segment text-segment-foreground" : "text-muted-foreground",
              )}
            >
              <Icon className="size-3.5" aria-hidden />
              {/* Phones: icons only, so the save button keeps its room. */}
              <span className="max-sm:sr-only">{label}</span>
            </button>
          ))}
        </div>
        <span className={cn("flex items-center gap-1.5 text-xs", dirty ? "text-psg-red" : "text-muted-foreground")}>
          <span aria-hidden className={cn("size-1.5 rounded-full sm:hidden", dirty ? "bg-psg-red" : "bg-ok")} />
          <span className="max-sm:sr-only">{dirty ? t("unsaved") : t("upToDate")}</span>
        </span>
        <div className="ml-auto flex items-center gap-2">
          {publicUrl ? (
            <a href={publicUrl} target="_blank" rel="noreferrer" className="hidden text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline sm:inline">
              {t("viewPublic")}
            </a>
          ) : null}
          {/* Phones: category, language, cover… in a panel (the text gets the whole screen). */}
          {desktop ? null : (
            <button type="button" onClick={() => setSettingsOpen(true)} className={adminButton("secondary", "sm")}>
              <SlidersHorizontal aria-hidden />
              <span className="sr-only">{t("settings")}</span>
            </button>
          )}
          <button type="button" onClick={save} disabled={pending || !canSave} className={adminButton("primary", "sm")}>
            {pending ? (
              t("saving")
            ) : current.mode === "draft" ? (
              <>
                {/* "Enregistrer le brouillon" is too long for a phone's bar. */}
                <span className="sm:hidden">{t("saveShort")}</span>
                <span className="max-sm:hidden">{t("saveDraft")}</span>
              </>
            ) : current.mode === "schedule" ? (
              t("schedule")
            ) : (
              t("publish")
            )}
          </button>
        </div>
      </div>

      {preview ? (
        <div className="space-y-8">
          <div className="mx-auto flex max-w-[44rem] flex-col gap-4">
            <span className="self-start rounded-full bg-psg-red px-[9px] py-1 font-wide text-[9px] font-semibold tracking-[0.08em] text-white uppercase">
              {tNews(`categories.${current.category}`)}
            </span>
            <h1 className="font-narrow text-[length:clamp(34px,6.4vw,68px)] leading-[0.92] font-extrabold text-balance uppercase italic">
              {current.title || t("untitled")}
            </h1>
            {current.excerpt ? <p className="text-[length:clamp(18px,2.2vw,21px)] leading-normal text-muted-foreground">{current.excerpt}</p> : null}
          </div>
          {current.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- uploaded media
            <img src={current.imageUrl} alt="" className="aspect-video w-full rounded-[14px] object-cover" />
          ) : null}
          <ArticleBody blocks={current.blocks.filter(isComplete)} refs={refs} eventsOpen />
        </div>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="min-w-0 space-y-5">
            <textarea
              value={current.title}
              maxLength={255}
              onChange={(event) => {
                set("title", event.target.value);
                if (!slugEdited) set("slug", slugify(event.target.value));
              }}
              placeholder={t("titlePlaceholder")}
              rows={1}
              // Accents of the first line need room above the capitals.
              className="w-full resize-none overflow-hidden bg-transparent pt-[0.2em] font-narrow text-[length:clamp(30px,5vw,48px)] leading-[1.02] font-extrabold uppercase italic outline-none [field-sizing:content] placeholder:text-muted-foreground/50"
            />
            <textarea
              value={current.excerpt}
              maxLength={500}
              onChange={(event) => set("excerpt", event.target.value)}
              placeholder={t("excerptPlaceholder")}
              rows={2}
              className="w-full resize-none bg-transparent text-lg leading-normal text-muted-foreground outline-none [field-sizing:content] placeholder:text-muted-foreground/50"
            />
            <BlockEditor value={blocks} onChange={setBlocks} matches={matches} events={events} />
          </div>

          {desktop ? <aside className="space-y-4 lg:sticky lg:top-20">{settings}</aside> : null}
        </div>
      )}
      {desktop ? null : (
        <ResponsivePanel open={settingsOpen} onOpenChange={setSettingsOpen} title={t("settings")}>
          <div className="space-y-4">{settings}</div>
        </ResponsivePanel>
      )}
    </div>
  );
}

/** A block worth publishing: text present, image chosen, match picked… */
export function isComplete(block: Block) {
  switch (block.type) {
    case "paragraph":
    case "heading":
    case "quote":
    case "callout":
      return block.text.trim() !== "";
    case "list":
      return block.items.some((item) => item.trim() !== "");
    case "image":
      return block.mediaId !== "";
    case "gallery":
      return block.images.length >= 2;
    case "video":
      return block.youtubeId !== "";
    case "match":
      return block.matchId !== "";
    case "event":
      return block.eventId !== "";
    case "divider":
      return true;
  }
}
