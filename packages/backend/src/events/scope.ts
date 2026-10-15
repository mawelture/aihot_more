import { DEFAULT_THEME_ID } from "../../../../themes/index.ts";
import { sql } from "../db.ts";
import { themeIdOf } from "../publication/scope.ts";

export function usesLegacyEventMembership(themeId?: string | null): boolean {
  return themeIdOf(themeId) === DEFAULT_THEME_ID;
}

export function eventScopeForTheme(themeId?: string | null) {
  return usesLegacyEventMembership(themeId)
    ? { themeId: themeIdOf(themeId), factsJoin: "", storiesJoin: "" }
    : {
        themeId: themeIdOf(themeId),
        factsJoin: "JOIN theme_facts tf ON tf.fact_id = f.id",
        storiesJoin: "JOIN theme_stories ts ON ts.story_id = st.id",
      };
}

export function factInThemeCondition(themeId?: string | null, factExpr = sql`f.id`) {
  return usesLegacyEventMembership(themeId)
    ? sql`TRUE`
    : sql`${factExpr} IN (SELECT fact_id FROM theme_facts WHERE theme_id = ${themeIdOf(themeId)})`;
}

export function storyInThemeCondition(themeId?: string | null, storyExpr = sql`st.id`) {
  return usesLegacyEventMembership(themeId)
    ? sql`TRUE`
    : sql`${storyExpr} IN (SELECT story_id FROM theme_stories WHERE theme_id = ${themeIdOf(themeId)})`;
}
