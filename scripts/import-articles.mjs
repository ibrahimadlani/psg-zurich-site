// Imports ready-made news articles (content/articles/*.json) as drafts, with their translations.
//
//   node --env-file=.env scripts/import-articles.mjs [folder]   # default folder: content/articles
//
// Runs on the server without TypeScript (like migrate.mjs). An article whose slug already exists
// is skipped, never overwritten: running it twice is harmless. Covers and publishing are then
// done in the CMS.
import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const LOCALES = ["fr", "de", "en"];
const CATEGORIES = ["club", "trips", "events"];
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
// Same limits as blockSchema (src/lib/article-blocks.ts); media, match and event blocks need ids
// from the target database, so they are not accepted here.
const BLOCK_RULES = {
  paragraph: (b) => str(b.text, 5000),
  heading: (b) => str(b.text, 200),
  quote: (b) => str(b.text, 600) && str(b.cite, 120),
  list: (b) => typeof b.ordered === "boolean" && Array.isArray(b.items) && b.items.length >= 1 && b.items.length <= 30 && b.items.every((item) => str(item, 600)),
  divider: () => true,
  callout: (b) => ["info", "important"].includes(b.tone) && str(b.text, 1000),
  video: (b) => /^[\w-]{11}$/.test(b.youtubeId ?? "") && str(b.caption, 300),
};

function str(value, max) {
  return typeof value === "string" && value.length <= max;
}

/** Problems with one translation, as readable messages (empty = valid). */
function check(t) {
  const errors = [];
  if (!SLUG.test(t.slug ?? "") || t.slug.length > 191) errors.push(`invalid slug "${t.slug}"`);
  if (!str(t.title, 255) || !t.title.trim()) errors.push("title missing or longer than 255");
  if (t.excerpt !== undefined && !str(t.excerpt, 500)) errors.push("excerpt longer than 500");
  if (t.byline !== undefined && !str(t.byline, 80)) errors.push("byline longer than 80");
  if (!Array.isArray(t.blocks) || t.blocks.length === 0 || t.blocks.length > 200) errors.push("blocks: 1 to 200 expected");
  else
    t.blocks.forEach((block, index) => {
      const rule = BLOCK_RULES[block?.type];
      if (!rule || !rule(block)) errors.push(`block ${index + 1} (${block?.type}) is invalid`);
    });
  return errors;
}

export async function importArticles({ databaseUrl = process.env.DATABASE_URL, folder }) {
  if (!databaseUrl) throw new Error("DATABASE_URL is not set.");
  const files = (await readdir(folder)).filter((name) => name.endsWith(".json")).sort();

  // Everything is checked before anything is written.
  const articles = [];
  for (const name of files) {
    const article = JSON.parse(await readFile(path.join(folder, name), "utf8"));
    const errors = [];
    if (!CATEGORIES.includes(article.category)) errors.push(`unknown category "${article.category}"`);
    const locales = Object.keys(article.translations ?? {});
    if (!locales.includes("fr")) errors.push("a French version is required (it anchors the translations)");
    for (const locale of locales) {
      if (!LOCALES.includes(locale)) errors.push(`unknown locale "${locale}"`);
      else errors.push(...check(article.translations[locale]).map((message) => `${locale}: ${message}`));
    }
    if (errors.length) throw new Error(`${name}:\n  - ${errors.join("\n  - ")}`);
    articles.push({ name, article });
  }

  const connection = await mysql.createConnection({ uri: databaseUrl, timezone: "Z" });
  let created = 0;
  let skipped = 0;
  try {
    for (const { name, article } of articles) {
      // French first: its id is the translation group of the others.
      const locales = LOCALES.filter((locale) => article.translations[locale]);
      const [existing] = await connection.query("SELECT id, slug, translation_group FROM posts WHERE slug IN (?)", [
        locales.map((locale) => article.translations[locale].slug),
      ]);
      const taken = new Set(existing.map((row) => row.slug));
      const french = existing.find((row) => row.slug === article.translations.fr.slug);
      const group = french ? (french.translation_group ?? french.id) : randomUUID();

      for (const locale of locales) {
        const t = article.translations[locale];
        if (taken.has(t.slug)) {
          console.log(`[import] ${name} (${locale}): "${t.slug}" already exists, skipped`);
          skipped++;
          continue;
        }
        const id = locale === "fr" ? group : randomUUID();
        await connection.query(
          `INSERT INTO posts (id, slug, locale, title, excerpt, content, category, translation_group, byline, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')`,
          [id, t.slug, locale, t.title, t.excerpt ?? null, JSON.stringify(t.blocks), article.category, group, t.byline ?? null],
        );
        console.log(`[import] ${name} (${locale}): draft "${t.title}"`);
        created++;
      }
    }
  } finally {
    await connection.end();
  }
  return { created, skipped };
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const folder = path.resolve(process.argv[2] ?? path.join(scriptDir, "..", "content", "articles"));
try {
  const { created, skipped } = await importArticles({ folder });
  console.log(`[import] done: ${created} draft(s) created, ${skipped} skipped`);
} catch (error) {
  console.error("[import] failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
