// Every editorial prompt is a Markdown file. A theme's own wording is
// `themes/<theme>/prompts/*.md`; wording shared by every theme is `themes/shared/prompts/*.md`.
// A name is read from the theme directory first, then from the shared directory.
// Two template forms, nothing else:
//   {{name}}     a value the calling step passes (plus siteName, from site/site.ts)
//   {{> file}}   another prompt file, inserted as it is (shared rules)
// A missing value or file is an error, never a silent blank. Versions are content hashes, so a receipt
// and the admin's model page always say which wording produced a result. A wording that is not a file
// of the pack yet (a candidate under evaluation) renders by the same two forms.
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { SITE } from "@aihot/site";
import { DEFAULT_THEME_ID, loadThemePack } from "../../../../themes/index.ts";

const SHARED_PROMPTS = path.resolve(import.meta.dirname, "../../../../themes/shared/prompts");

const TOKEN = /\{\{(>\s*)?([A-Za-z][\w.-]*)\s*\}\}/g;

const files = new Map<string, string>();

function promptFile(themeId: string, name: string): string {
  const themed = path.join(loadThemePack(themeId).promptsDir, `${name}.md`);
  if (existsSync(themed)) return themed;
  const shared = path.join(SHARED_PROMPTS, `${name}.md`);
  if (existsSync(shared)) return shared;
  return themed;
}

function raw(themeId: string, name: string): string {
  const cacheKey = `${themeId}:${name}`;
  let text = files.get(cacheKey);
  if (text === undefined) {
    text = readFileSync(promptFile(themeId, name), "utf8");
    files.set(cacheKey, text);
  }
  return text;
}

/** `text` with its includes expanded, and the names of every file it read. */
function expandText(themeId: string, text: string, seen: string[]): { text: string; used: string[] } {
  const used: string[] = [];
  const expanded = text.replace(TOKEN, (token, include: string | undefined, key: string) => {
    if (!include) return token;
    const inner = expand(themeId, key, seen);
    used.push(...inner.used);
    return inner.text;
  });
  return { text: expanded, used };
}

/** The file with its includes expanded, and the names of every file it read. */
function expand(themeId: string, name: string, seen: string[] = []): { text: string; used: string[] } {
  if (seen.includes(name)) throw new Error(`prompt include cycle: ${[...seen, name].join(" → ")}`);
  const inner = expandText(themeId, raw(themeId, name), [...seen, name]);
  return { text: inner.text, used: [name, ...inner.used] };
}

function fill(name: string, text: string, values: Record<string, string>): string {
  const all: Record<string, string> = { siteName: SITE.name, ...values };
  return text.replace(TOKEN, (_token, _include, key: string) => {
    const value = all[key];
    if (value === undefined) throw new Error(`prompt ${name}: no value for {{${key}}}`);
    return value;
  });
}

/** A prompt with its values filled in. */
export function promptText(name: string, values: Record<string, string> = {}): string {
  return promptTextForTheme(DEFAULT_THEME_ID, name, values);
}

export function promptTextForTheme(themeId: string, name: string, values: Record<string, string> = {}): string {
  return fill(name, expand(themeId, name).text, values);
}

/** Wording given as text instead of a pack file, rendered like one; `label` names it in errors. */
export function promptFromText(label: string, text: string, values: Record<string, string> = {}): string {
  return fill(label, expandText(DEFAULT_THEME_ID, text, []).text, values);
}

/** `name@hash` over the files a prompt reads, so any edit shows up as a new version. */
export function promptVersion(...names: string[]): string {
  return promptVersionForTheme(DEFAULT_THEME_ID, ...names);
}

export function promptVersionForTheme(themeId: string, ...names: string[]): string {
  const used = [...new Set(names.flatMap((n) => expand(themeId, n).used))].sort();
  const hash = createHash("sha256");
  for (const n of used) hash.update(`${n}\n${raw(themeId, n)}\n`);
  return `${names.join("+")}@${hash.digest("hex").slice(0, 10)}`;
}
