// Which translation namespaces the browser needs. Server components read messages on the server;
// only components that run in the browser need theirs sent with the page (they weigh hundreds of
// kilobytes otherwise, on every page). This walks the imports from each page and layout and
// collects the namespaces used by code that ends up in the browser.
//
//   node scripts/client-messages.mjs           # fails if src/i18n/client-namespaces.ts is out of date
//   node scripts/client-messages.mjs --write   # rewrites it
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const src = path.join(root, "src");
const target = path.join(src, "i18n", "client-namespaces.ts");
const ENTRY = /^(page|layout|template|loading|error|not-found|global-error|global-not-found)\.tsx?$/;

const walk = (dir) => readdirSync(dir).flatMap((name) => {
  const full = path.join(dir, name);
  return statSync(full).isDirectory() ? walk(full) : [full];
});

function resolve(from, spec) {
  const base = spec.startsWith("@/") ? path.join(src, spec.slice(2)) : spec.startsWith(".") ? path.resolve(path.dirname(from), spec) : null;
  if (!base) return null;
  for (const option of [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts"), path.join(base, "index.tsx")]) {
    if (existsSync(option) && statSync(option).isFile()) return option;
  }
  return null;
}

const cache = new Map();
function read(file) {
  if (cache.has(file)) return cache.get(file);
  const code = readFileSync(file, "utf8");
  const imports = [];
  // "import x from", "export { y } from", 'import("z")'. Imports of types only never run.
  for (const match of code.matchAll(/^\s*(import|export)\s+([^;'"]*?)\s*from\s*["']([^"']+)["']/gm)) {
    const clause = match[2];
    if (/^type\s/.test(clause)) continue;
    const names = /\{([^}]*)\}/.exec(clause)?.[1];
    const onlyTypes = names && !clause.replace(/\{[^}]*\}/, "").replace(/[,\s]/g, "") && names.split(",").map((n) => n.trim()).filter(Boolean).every((n) => n.startsWith("type "));
    if (!onlyTypes) imports.push(match[3]);
  }
  for (const match of code.matchAll(/\bimport\(\s*["']([^"']+)["']\s*\)/g)) imports.push(match[1]);
  const info = {
    client: /^\s*(?:\/\/[^\n]*\n|\/\*[\s\S]*?\*\/\s*)*["']use client["']/.test(code),
    imports: imports.map((spec) => resolve(file, spec)).filter(Boolean),
    namespaces: [
      ...[...code.matchAll(/\buseTranslations\(\s*["']([^"']+)["']\s*\)/g)].map((match) => match[1]),
      // A toast for the next page, by key: read in the browser by <PendingToasts />.
      ...[...code.matchAll(/\bafterNavigation\([^;]*?\{\s*key:\s*["']([^"']+)["']/g)].map((match) => match[1]),
    ].map((name) => name.split(".")[0]),
    // A namespace chosen at run time, or the whole catalogue, cannot be listed from here.
    // (<PendingToasts /> only reads the keys collected above, and checks they exist first.)
    unknown: !file.endsWith("pending-toasts.tsx") && /\buseTranslations\(\s*(?!["'])[^)]*\)|\buseMessages\(/.test(code),
  };
  cache.set(file, info);
  return info;
}

/** Namespaces reached by browser code from these pages and layouts. */
function namespacesFrom(entries, problems) {
  const found = new Set();
  const seen = new Set();
  const queue = entries.map((file) => [file, false]);
  while (queue.length) {
    const [file, inBrowser] = queue.pop();
    const info = read(file);
    const browser = inBrowser || info.client;
    const key = `${file}|${browser}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (browser) {
      info.namespaces.forEach((name) => found.add(name));
      if (info.unknown) problems.add(path.relative(root, file));
    }
    for (const next of info.imports) queue.push([next, browser]);
  }
  return [...found].sort();
}

const entries = walk(path.join(src, "app")).filter((file) => ENTRY.test(path.basename(file)));
const isAdmin = (file) => file.includes(`${path.sep}(admin)${path.sep}`);
const problems = new Set();
const site = namespacesFrom(entries.filter((file) => !isAdmin(file)), problems);
const admin = namespacesFrom(entries.filter(isAdmin), problems);

if (problems.size) {
  console.error(`[client-messages] namespace not written literally in useTranslations():\n  ${[...problems].join("\n  ")}`);
  process.exit(1);
}

const list = (names) => names.map((name) => `  "${name}",`).join("\n");
const output = `// Written by scripts/client-messages.mjs: run \`node scripts/client-messages.mjs --write\` after
// using a new namespace in a client component (the build fails until then).

/** Namespaces the browser needs on the public site and the member area. */
export const SITE_NAMESPACES = [
${list(site)}
] as const;

/** Namespaces the browser needs in the admin. */
export const ADMIN_NAMESPACES = [
${list(admin)}
] as const;
`;

if (process.argv.includes("--write")) {
  writeFileSync(target, output);
  console.log(`[client-messages] ${path.relative(root, target)}: ${site.length} for the site, ${admin.length} for the admin`);
} else if (!existsSync(target) || readFileSync(target, "utf8") !== output) {
  console.error("[client-messages] src/i18n/client-namespaces.ts is out of date: run `node scripts/client-messages.mjs --write`.");
  process.exit(1);
}
