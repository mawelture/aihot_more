import { readFileSync } from "node:fs";
import path from "node:path";
import { DEFAULT_THEME_ID, THEME_MANIFEST, type ThemeManifestEntry } from "./manifest.ts";
import * as aiTaxonomy from "./ai/taxonomy.ts";
import { SELECTION as aiSelection } from "./ai/selection.ts";
import * as macroTaxonomy from "./macro/taxonomy.ts";
import { SELECTION as macroSelection } from "./macro/selection.ts";
import * as quantTaxonomy from "./quant/taxonomy.ts";
import { SELECTION as quantSelection } from "./quant/selection.ts";
import * as web3Taxonomy from "./web3/taxonomy.ts";
import { SELECTION as web3Selection } from "./web3/selection.ts";

export type { ThemeManifestEntry };
export { DEFAULT_THEME_ID, THEME_MANIFEST };

export type ThemeId = string;

export type ThemeDefinition = ThemeManifestEntry;

export interface ThemeTopicsFile {
  groups: Array<{ key: string; name: string; blurb: string }>;
  topics: Array<{
    slug: string;
    name: string;
    group: string;
    entityId?: string;
    aliases?: string[];
    tags?: string[];
    definition: string;
  }>;
}

const PACKS = {
  ai: { taxonomy: aiTaxonomy, selection: aiSelection },
  macro: { taxonomy: macroTaxonomy, selection: macroSelection },
  quant: { taxonomy: quantTaxonomy, selection: quantSelection },
  web3: { taxonomy: web3Taxonomy, selection: web3Selection },
};

type PackId = keyof typeof PACKS;

const manifestIds = THEME_MANIFEST.map((theme) => theme.id);
const packIds = Object.keys(PACKS);
if (manifestIds.length !== packIds.length || manifestIds.some((id) => !packIds.includes(id))) {
  throw new Error(`Theme manifest [${manifestIds.join(", ")}] does not match packs [${packIds.join(", ")}]`);
}

export interface ThemePack extends ThemeDefinition {
  taxonomy: (typeof PACKS)[PackId]["taxonomy"];
  selection: (typeof PACKS)[PackId]["selection"];
  topics: ThemeTopicsFile;
  promptsDir: string;
}

const ROOT = path.resolve(import.meta.dirname, "..");

export function listThemeDefinitions(): readonly ThemeDefinition[] {
  return THEME_MANIFEST;
}

export function getThemeDefinition(themeId: string): ThemeDefinition | null {
  return THEME_MANIFEST.find((theme) => theme.id === themeId) ?? null;
}

function readTopics(themeId: string): ThemeTopicsFile {
  const file = path.join(ROOT, "themes", themeId, "topics.json");
  return JSON.parse(readFileSync(file, "utf8")) as ThemeTopicsFile;
}

/** Demo sources for one theme pack. Seed imports each enabled theme's file and subscribes it only to that theme. */
export function themeSourcePath(themeId: string): string {
  return path.join(ROOT, "themes", themeId, "sources.json");
}

export function loadThemePack(themeId: string): ThemePack {
  const theme = getThemeDefinition(themeId);
  if (!theme || !Object.hasOwn(PACKS, themeId)) throw new Error(`Unknown theme: ${themeId}`);
  const pack = PACKS[themeId as PackId];
  return {
    ...theme,
    taxonomy: pack.taxonomy,
    selection: pack.selection,
    topics: readTopics(theme.id),
    promptsDir: path.join(ROOT, "themes", theme.id, "prompts"),
  };
}
