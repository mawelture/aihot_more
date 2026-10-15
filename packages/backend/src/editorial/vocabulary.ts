// Tag normalization and company identity over the active theme pack's vocabulary,
// which the theme topics are built on.
import { DEFAULT_THEME_ID, loadThemePack } from "../../../../themes/index.ts";

function taxonomyForTheme(themeId?: string | null) {
  return loadThemePack(themeId ?? DEFAULT_THEME_ID).taxonomy;
}

export function vocabularyForTheme(themeId?: string | null) {
  const taxonomy = taxonomyForTheme(themeId);
  const {
    CATEGORIES,
    CATEGORY_TAGS,
    ENTITIES,
    ENTITY_TAGS,
    IDENTITY_CONTEXT_ALIASES,
    IDENTITY_LEXICON,
    ITEM_TYPES,
    PLAIN_TERMS,
    PUBLISHER_DOMAINS,
    RELEASE,
    TAG_SYNONYMS,
    TOPIC_TAGS,
  } = taxonomy;
  const allowedTags = new Set<string>([...CATEGORY_TAGS, ...TOPIC_TAGS, ...ENTITY_TAGS]);
  const categoryGuide = CATEGORIES.map((c) => `- ${c.key}（${c.label}）：${c.guide}`).join("\n");
  const isCategory = (tag: string) => (CATEGORY_TAGS as readonly string[]).includes(tag);
  const normalizeTags = (value: unknown): string[] => {
    const raw = Array.isArray(value) ? value : typeof value === "string" ? value.split(/[,，]/g) : [];
    const tags: string[] = [];
    for (const item of raw) {
      const trimmed = String(item ?? "").trim().replace(/^#/, "");
      const tag = TAG_SYNONYMS[trimmed] ?? TAG_SYNONYMS[trimmed.toLowerCase()] ?? trimmed;
      if (tag && allowedTags.has(tag) && !tags.includes(tag)) tags.push(tag);
    }
    const categoryIndex = tags.findIndex(isCategory);
    const category = categoryIndex >= 0 ? tags[categoryIndex]! : CATEGORY_TAGS[CATEGORY_TAGS.length - 1]!;
    return [category, ...tags.filter((tag) => tag !== category)].slice(0, 6);
  };
  return {
    taxonomy,
    CATEGORIES,
    CATEGORY_GUIDE: categoryGuide,
    CATEGORY_TAGS,
    ENTITIES,
    ENTITY_TAGS,
    IDENTITY_CONTEXT_ALIASES,
    IDENTITY_LEXICON,
    ITEM_TYPES,
    PLAIN_TERMS,
    PUBLISHER_DOMAINS,
    RELEASE,
    TAG_SYNONYMS,
    TOPIC_TAGS,
    normalizeTags,
    isRelease: (category: string | null, tags: readonly string[]) => RELEASE !== null && category === RELEASE.category && tags.includes(RELEASE.tag),
  };
}

export const {
  CATEGORIES,
  CATEGORY_GUIDE,
  CATEGORY_TAGS,
  ENTITIES,
  ENTITY_TAGS,
  IDENTITY_CONTEXT_ALIASES,
  IDENTITY_LEXICON,
  ITEM_TYPES,
  PLAIN_TERMS,
  PUBLISHER_DOMAINS,
  RELEASE,
  TAG_SYNONYMS,
  TOPIC_TAGS,
  normalizeTags,
  isRelease,
} = vocabularyForTheme(DEFAULT_THEME_ID);

const key = (value: string) => value.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, "");

/** Exact entity/alias only: mentions embedded in a sentence are not ownership. */
export function entityIdentity(value: string | null | undefined, themeId?: string | null): string | null {
  if (!value?.trim()) return null;
  const { ENTITIES } = vocabularyForTheme(themeId);
  const normalized = key(value);
  const matches = Object.entries(ENTITIES).filter(([id, entity]) => [id, entity.name, ...entity.aliases, ...(entity.otherNames ?? [])].some((alias) => key(alias) === normalized));
  return matches.length > 1 ? null : matches[0]?.[0] ?? null;
}
