import { z } from "zod";

/*
 * Article body: a list of blocks stored as JSON in posts.content.
 * Text fields accept a tiny, safe inline syntax: **bold**, *italic*, [link](https://…).
 * It is parsed into React elements (see RichText); raw HTML is never rendered.
 */

const text = (max: number) => z.string().max(max);
const id = z.string().min(1).max(36);

export const blockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("paragraph"), text: text(5000) }),
  z.object({ type: z.literal("heading"), text: text(200) }),
  z.object({ type: z.literal("quote"), text: text(600), cite: text(120) }),
  z.object({ type: z.literal("list"), ordered: z.boolean(), items: z.array(text(600)).min(1).max(30) }),
  z.object({ type: z.literal("divider") }),
  z.object({ type: z.literal("image"), mediaId: id, alt: text(200), caption: text(300) }),
  z.object({
    type: z.literal("gallery"),
    images: z.array(z.object({ mediaId: id, alt: text(200) })).min(2).max(6),
    caption: text(300),
  }),
  z.object({ type: z.literal("callout"), tone: z.enum(["info", "important"]), text: text(1000) }),
  z.object({ type: z.literal("video"), youtubeId: z.string().regex(/^[\w-]{11}$/), caption: text(300) }),
  z.object({ type: z.literal("match"), matchId: id }),
  z.object({ type: z.literal("event"), eventId: id }),
]);

export type Block = z.infer<typeof blockSchema>;
export type BlockType = Block["type"];
export const BLOCK_TYPES = [
  "paragraph",
  "heading",
  "quote",
  "list",
  "divider",
  "image",
  "gallery",
  "callout",
  "video",
  "match",
  "event",
] as const satisfies readonly BlockType[];

export const blocksSchema = z.array(blockSchema).max(200);

/** Body of an article from the database; anything unreadable gives an empty article. */
export function parseBlocks(content: string): Block[] {
  try {
    const parsed = blocksSchema.safeParse(JSON.parse(content));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

/** Empty block of each type, for the editor. */
export function emptyBlock(type: BlockType): Block {
  switch (type) {
    case "paragraph":
    case "heading":
      return { type, text: "" };
    case "quote":
      return { type, text: "", cite: "" };
    case "list":
      return { type, ordered: false, items: [""] };
    case "divider":
      return { type };
    case "image":
      return { type, mediaId: "", alt: "", caption: "" };
    case "gallery":
      return { type, images: [], caption: "" };
    case "callout":
      return { type, tone: "info", text: "" };
    case "video":
      return { type, youtubeId: "", caption: "" };
    case "match":
      return { type, matchId: "" };
    case "event":
      return { type, eventId: "" };
  }
}

/** Plain words of the body (markup removed), for the reading time. */
export function blocksText(blocks: Block[]) {
  return blocks
    .flatMap((block) => {
      if ("text" in block) return [block.text];
      if (block.type === "list") return block.items;
      return [];
    })
    .join(" ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*]/g, "");
}

/** Minutes of reading at ~200 words a minute (at least 1). */
export const readingMinutes = (blocks: Block[], extra = "") =>
  Math.max(1, Math.round(`${extra} ${blocksText(blocks)}`.trim().split(/\s+/).filter(Boolean).length / 200));

/** YouTube id from a URL ("watch?v=", "youtu.be/", "shorts/", "embed/") or from the id itself. */
export function youtubeId(input: string) {
  const value = input.trim();
  if (/^[\w-]{11}$/.test(value)) return value;
  const found = value.match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([\w-]{11})/);
  return found?.[1] ?? null;
}

export type InlineNode =
  | { kind: "text"; text: string }
  | { kind: "bold"; children: InlineNode[] }
  | { kind: "italic"; children: InlineNode[] }
  | { kind: "link"; href: string; children: InlineNode[] };

/** Only web and mail links: no javascript:, data:, etc. */
export function safeHref(href: string) {
  const value = href.trim();
  if (/^https?:\/\//i.test(value) || /^mailto:/i.test(value)) return value;
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  return null;
}

/** Parses **bold**, *italic* and [text](url); everything else stays plain text. */
export function parseInline(source: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  let rest = source;
  const pushText = (value: string) => {
    if (!value) return;
    const last = nodes.at(-1);
    if (last?.kind === "text") last.text += value;
    else nodes.push({ kind: "text", text: value });
  };

  while (rest.length > 0) {
    const link = rest.match(/^\[([^\]\n]+)\]\(([^)\s]+)\)/);
    if (link) {
      const href = safeHref(link[2]!);
      if (href) nodes.push({ kind: "link", href, children: parseInline(link[1]!) });
      else pushText(link[1]!);
      rest = rest.slice(link[0].length);
      continue;
    }
    const bold = rest.match(/^\*\*(?=\S)([\s\S]*?\S)\*\*/);
    if (bold) {
      nodes.push({ kind: "bold", children: parseInline(bold[1]!) });
      rest = rest.slice(bold[0].length);
      continue;
    }
    const italic = rest.match(/^\*(?=[^\s*])([\s\S]*?[^\s*])\*/);
    if (italic) {
      nodes.push({ kind: "italic", children: parseInline(italic[1]!) });
      rest = rest.slice(italic[0].length);
      continue;
    }
    // Plain text up to the next possible marker.
    const next = rest.slice(1).search(/[[*]/);
    const end = next === -1 ? rest.length : next + 1;
    pushText(rest.slice(0, end));
    rest = rest.slice(end);
  }
  return nodes;
}
