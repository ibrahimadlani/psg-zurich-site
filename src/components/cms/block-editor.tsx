"use client";

import {
  ArrowDown,
  ArrowUp,
  Bold,
  CalendarDays,
  Copy,
  Heading2,
  Image as ImageIcon,
  Images,
  Info,
  Italic,
  Link2,
  List,
  Minus,
  Pilcrow,
  Plus,
  Quote,
  Trash2,
  Trophy,
  Video,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { BLOCK_TYPES, emptyBlock, youtubeId, type Block, type BlockType } from "@/lib/article-blocks";
import { uploadMedia } from "@/lib/image-resize";
import { cn } from "@/lib/utils";

export type Option = { id: string; label: string };

/** A block plus a stable key for React (blocks move around; their local state must follow). */
export type KeyedBlock = { key: string; block: Block };
export const withKey = (block: Block): KeyedBlock => ({ key: crypto.randomUUID(), block });

const ICONS: Record<BlockType, typeof Pilcrow> = {
  paragraph: Pilcrow,
  heading: Heading2,
  quote: Quote,
  list: List,
  divider: Minus,
  image: ImageIcon,
  gallery: Images,
  callout: Info,
  video: Video,
  match: Trophy,
  event: CalendarDays,
};

const field =
  "w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
const select = `${field} h-9 py-0`;

/** Textarea that grows with its content, with bold / italic / link buttons wrapping the selection. */
function RichTextArea({
  value,
  onChange,
  placeholder,
  large = false,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  large?: boolean;
}) {
  const t = useTranslations("Cms.editor");
  const ref = useRef<HTMLTextAreaElement>(null);

  const wrap = (before: string, after: string, fallback: string) => {
    const area = ref.current;
    if (!area) return;
    const { selectionStart: start, selectionEnd: end } = area;
    const selected = value.slice(start, end) || fallback;
    const next = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`;
    onChange(next);
    requestAnimationFrame(() => {
      area.focus();
      area.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  };
  const link = () => {
    const url = window.prompt(t("linkPrompt"), "https://");
    if (url && url !== "https://") wrap("[", `](${url.trim()})`, t("linkText"));
  };
  const tool = "inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-foreground/5 hover:text-foreground [&_svg]:size-3.5";

  return (
    <div className="rounded-lg border border-input focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
      <div className="flex gap-0.5 border-b px-1.5 py-1">
        <button type="button" className={tool} title={t("bold")} aria-label={t("bold")} onClick={() => wrap("**", "**", t("bold"))}>
          <Bold aria-hidden />
        </button>
        <button type="button" className={tool} title={t("italic")} aria-label={t("italic")} onClick={() => wrap("*", "*", t("italic"))}>
          <Italic aria-hidden />
        </button>
        <button type="button" className={tool} title={t("link")} aria-label={t("link")} onClick={link}>
          <Link2 aria-hidden />
        </button>
      </div>
      <textarea
        ref={ref}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={cn("block w-full resize-none overflow-hidden bg-transparent px-3 py-2 outline-none [field-sizing:content]", large ? "min-h-24 text-[15px] leading-relaxed" : "min-h-16 text-sm")}
      />
    </div>
  );
}

/** Picks a file, uploads it (resized), returns the media ids. */
function useUpload(maxSize: number) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const upload = async (files: File[]) => {
    setBusy(true);
    setFailed(false);
    try {
      return await Promise.all(files.map((file) => uploadMedia(file, maxSize).then((media) => media.id)));
    } catch {
      setFailed(true);
      return [];
    } finally {
      setBusy(false);
    }
  };
  return { busy, failed, upload };
}

function FilePicker({
  multiple = false,
  label,
  onFiles,
  disabled,
}: {
  multiple?: boolean;
  label: string;
  onFiles: (files: File[]) => void;
  disabled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => input.current?.click()}>
        <Plus aria-hidden />
        {label}
      </Button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          const files = [...(event.target.files ?? [])];
          event.target.value = "";
          if (files.length) onFiles(files);
        }}
      />
    </>
  );
}

const thumb = (id: string) => `/api/v1/media/${id}`;

/** Form of one block, by type. */
function BlockFields({
  block,
  onChange,
  matches,
  events,
}: {
  block: Block;
  onChange: (block: Block) => void;
  matches: Option[];
  events: Option[];
}) {
  const t = useTranslations("Cms.editor");
  const image = useUpload(1600);
  const gallery = useUpload(1200);

  switch (block.type) {
    case "paragraph":
      return <RichTextArea large value={block.text} onChange={(text) => onChange({ ...block, text })} placeholder={t("paragraphPlaceholder")} />;
    case "heading":
      return (
        <Input
          value={block.text}
          maxLength={200}
          onChange={(event) => onChange({ ...block, text: event.target.value })}
          placeholder={t("headingPlaceholder")}
          className="text-lg font-semibold"
        />
      );
    case "quote":
      return (
        <div className="space-y-2">
          <textarea
            value={block.text}
            maxLength={600}
            onChange={(event) => onChange({ ...block, text: event.target.value })}
            placeholder={t("quotePlaceholder")}
            className={cn(field, "min-h-16 resize-none font-narrow text-xl font-bold italic [field-sizing:content]")}
          />
          <Input value={block.cite} maxLength={120} onChange={(event) => onChange({ ...block, cite: event.target.value })} placeholder={t("citePlaceholder")} />
        </div>
      );
    case "list":
      return (
        <div className="space-y-2">
          <div className="inline-flex rounded-lg border p-0.5 text-xs">
            {[false, true].map((ordered) => (
              <button
                key={String(ordered)}
                type="button"
                onClick={() => onChange({ ...block, ordered })}
                className={cn("cursor-pointer rounded-md px-2.5 py-1", block.ordered === ordered ? "bg-segment text-segment-foreground" : "text-muted-foreground")}
              >
                {t(ordered ? "numbered" : "bulleted")}
              </button>
            ))}
          </div>
          {block.items.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="w-5 text-right text-xs text-muted-foreground">{block.ordered ? `${index + 1}.` : "•"}</span>
              <Input
                value={item}
                onChange={(event) => onChange({ ...block, items: block.items.map((value, i) => (i === index ? event.target.value : value)) })}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    onChange({ ...block, items: [...block.items.slice(0, index + 1), "", ...block.items.slice(index + 1)] });
                  }
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t("removeItem")}
                disabled={block.items.length === 1}
                onClick={() => onChange({ ...block, items: block.items.filter((_, i) => i !== index) })}
              >
                <X aria-hidden />
              </Button>
            </div>
          ))}
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange({ ...block, items: [...block.items, ""] })}>
            <Plus aria-hidden />
            {t("addItem")}
          </Button>
        </div>
      );
    case "divider":
      return <p className="text-center text-sm text-muted-foreground">• • •</p>;
    case "image":
      return (
        <div className="space-y-2">
          {block.mediaId ? (
            // eslint-disable-next-line @next/next/no-img-element -- uploaded media
            <img src={thumb(block.mediaId)} alt="" className="max-h-72 w-full rounded-lg bg-card object-contain" />
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <FilePicker
              label={block.mediaId ? t("replaceImage") : t("chooseImage")}
              disabled={image.busy}
              onFiles={async (files) => {
                const [mediaId] = await image.upload(files.slice(0, 1));
                if (mediaId) onChange({ ...block, mediaId });
              }}
            />
            {image.busy ? <span className="text-xs text-muted-foreground">{t("uploading")}</span> : null}
            {image.failed ? <span className="text-xs text-destructive">{t("uploadFailed")}</span> : null}
          </div>
          <Input value={block.alt} maxLength={200} onChange={(event) => onChange({ ...block, alt: event.target.value })} placeholder={t("altPlaceholder")} />
          <Input value={block.caption} maxLength={300} onChange={(event) => onChange({ ...block, caption: event.target.value })} placeholder={t("captionPlaceholder")} />
        </div>
      );
    case "gallery":
      return (
        <div className="space-y-2">
          {block.images.length ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {block.images.map((item) => (
                <div key={item.mediaId} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element -- uploaded media */}
                  <img src={thumb(item.mediaId)} alt="" className="aspect-square w-full rounded-md bg-card object-cover" />
                  <button
                    type="button"
                    aria-label={t("removeImage")}
                    onClick={() => onChange({ ...block, images: block.images.filter((image) => image.mediaId !== item.mediaId) })}
                    className="absolute top-1 right-1 grid size-5 cursor-pointer place-items-center rounded-full bg-black/60 text-white [&_svg]:size-3"
                  >
                    <X aria-hidden />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <FilePicker
              multiple
              label={t("addImages")}
              disabled={gallery.busy || block.images.length >= 6}
              onFiles={async (files) => {
                const ids = await gallery.upload(files.slice(0, 6 - block.images.length));
                onChange({ ...block, images: [...block.images, ...ids.map((mediaId) => ({ mediaId, alt: "" }))] });
              }}
            />
            <span className="text-xs text-muted-foreground">{gallery.busy ? t("uploading") : t("galleryHint", { count: block.images.length })}</span>
            {gallery.failed ? <span className="text-xs text-destructive">{t("uploadFailed")}</span> : null}
          </div>
          <Input value={block.caption} maxLength={300} onChange={(event) => onChange({ ...block, caption: event.target.value })} placeholder={t("captionPlaceholder")} />
        </div>
      );
    case "callout":
      return (
        <div className="space-y-2">
          <div className="inline-flex rounded-lg border p-0.5 text-xs">
            {(["info", "important"] as const).map((tone) => (
              <button
                key={tone}
                type="button"
                onClick={() => onChange({ ...block, tone })}
                className={cn("cursor-pointer rounded-md px-2.5 py-1", block.tone === tone ? "bg-segment text-segment-foreground" : "text-muted-foreground")}
              >
                {t(`tones.${tone}`)}
              </button>
            ))}
          </div>
          <RichTextArea value={block.text} onChange={(text) => onChange({ ...block, text })} placeholder={t("calloutPlaceholder")} />
        </div>
      );
    case "video":
      return <VideoFields block={block} onChange={onChange} />;
    case "match":
      return (
        <select className={select} value={block.matchId} onChange={(event) => onChange({ ...block, matchId: event.target.value })}>
          <option value="">{t("chooseMatch")}</option>
          {matches.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      );
    case "event":
      return (
        <select className={select} value={block.eventId} onChange={(event) => onChange({ ...block, eventId: event.target.value })}>
          <option value="">{t("chooseEvent")}</option>
          {events.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      );
  }
}

function VideoFields({ block, onChange }: { block: Extract<Block, { type: "video" }>; onChange: (block: Block) => void }) {
  const t = useTranslations("Cms.editor");
  const [url, setUrl] = useState(block.youtubeId ? `https://youtu.be/${block.youtubeId}` : "");
  const invalid = url.trim() !== "" && !youtubeId(url);
  return (
    <div className="space-y-2">
      <Input
        value={url}
        placeholder="https://www.youtube.com/watch?v=…"
        aria-invalid={invalid || undefined}
        onChange={(event) => {
          setUrl(event.target.value);
          onChange({ ...block, youtubeId: youtubeId(event.target.value) ?? "" });
        }}
      />
      {invalid ? <p className="text-xs text-destructive">{t("videoInvalid")}</p> : null}
      {block.youtubeId ? (
        // eslint-disable-next-line @next/next/no-img-element -- YouTube thumbnail
        <img src={`https://i.ytimg.com/vi/${block.youtubeId}/hqdefault.jpg`} alt="" className="w-48 rounded-md" />
      ) : null}
      <Input value={block.caption} maxLength={300} onChange={(event) => onChange({ ...block, caption: event.target.value })} placeholder={t("captionPlaceholder")} />
    </div>
  );
}

/** "+ Add a block" menu with every format. */
function AddBlockMenu({ onAdd, compact = false }: { onAdd: (type: BlockType) => void; compact?: boolean }) {
  const t = useTranslations("Cms.editor");
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant={compact ? "ghost" : "outline"} size="sm" className={compact ? "h-6 text-xs text-muted-foreground" : ""}>
          <Plus aria-hidden />
          {t("addBlock")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {BLOCK_TYPES.map((type) => {
          const Icon = ICONS[type];
          return (
            <DropdownMenuItem key={type} onSelect={() => onAdd(type)} className="items-start gap-3 py-2">
              <Icon className="mt-0.5" aria-hidden />
              <span className="flex flex-col">
                <span className="font-medium">{t(`types.${type}.label`)}</span>
                <span className="text-xs text-muted-foreground">{t(`types.${type}.hint`)}</span>
              </span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Ordered list of blocks: edit, move, duplicate, delete, insert anywhere. */
export function BlockEditor({
  value,
  onChange,
  matches,
  events,
}: {
  value: KeyedBlock[];
  onChange: (blocks: KeyedBlock[]) => void;
  matches: Option[];
  events: Option[];
}) {
  const t = useTranslations("Cms.editor");
  const insert = (index: number, type: BlockType) => onChange([...value.slice(0, index), withKey(emptyBlock(type)), ...value.slice(index)]);
  const update = (index: number, block: Block) => onChange(value.map((item, i) => (i === index ? { ...item, block } : item)));
  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target]!, next[index]!];
    onChange(next);
  };
  const action = "inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-foreground/5 hover:text-foreground disabled:pointer-events-none disabled:opacity-30 [&_svg]:size-3.5";

  return (
    <div className="space-y-3">
      {value.map(({ key, block }, index) => {
        const Icon = ICONS[block.type];
        return (
          <div key={key} className="space-y-1">
            <div className="rounded-[12px] border bg-card/70">
              <div className="flex items-center gap-2 border-b px-3 py-1.5">
                <Icon className="size-3.5 text-muted-foreground" aria-hidden />
                <span className="flex-1 text-xs font-medium text-muted-foreground">{t(`types.${block.type}.label`)}</span>
                <button type="button" className={action} aria-label={t("moveUp")} title={t("moveUp")} disabled={index === 0} onClick={() => move(index, -1)}>
                  <ArrowUp aria-hidden />
                </button>
                <button type="button" className={action} aria-label={t("moveDown")} title={t("moveDown")} disabled={index === value.length - 1} onClick={() => move(index, 1)}>
                  <ArrowDown aria-hidden />
                </button>
                <button type="button" className={action} aria-label={t("duplicate")} title={t("duplicate")} onClick={() => onChange([...value.slice(0, index + 1), withKey(structuredClone(block)), ...value.slice(index + 1)])}>
                  <Copy aria-hidden />
                </button>
                <button
                  type="button"
                  className={cn(action, "hover:text-destructive")}
                  aria-label={t("remove")}
                  title={t("remove")}
                  onClick={() => onChange(value.filter((_, i) => i !== index))}
                >
                  <Trash2 aria-hidden />
                </button>
              </div>
              <div className="p-3">
                <BlockFields block={block} onChange={(next) => update(index, next)} matches={matches} events={events} />
              </div>
            </div>
            <div className="flex justify-center">
              <AddBlockMenu compact onAdd={(type) => insert(index + 1, type)} />
            </div>
          </div>
        );
      })}
      {value.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-[12px] border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
          <AddBlockMenu onAdd={(type) => insert(0, type)} />
        </div>
      ) : null}
    </div>
  );
}
