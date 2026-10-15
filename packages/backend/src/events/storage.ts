import { DEFAULT_THEME_ID } from "../../../../themes/index.ts";
import { themeIdOf } from "../publication/scope.ts";

export function usesLegacyGroupingTables(themeId?: string | null): boolean {
  return themeIdOf(themeId) === DEFAULT_THEME_ID;
}

export function groupingStorageForTheme(themeId?: string | null) {
  return usesLegacyGroupingTables(themeId)
    ? {
        decisionsTable: "grouping_decisions",
        overridesTable: "grouping_overrides",
      }
    : {
        decisionsTable: "theme_grouping_decisions",
        overridesTable: "theme_grouping_overrides",
      };
}
