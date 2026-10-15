import { DEFAULT_THEME_ID } from "../../../../themes/index.ts";
import { themeIdOf } from "../publication/scope.ts";

export function usesLegacyEditorialOverrideTable(themeId?: string | null): boolean {
  return themeIdOf(themeId) === DEFAULT_THEME_ID;
}

export function editorialOverrideStorageForTheme(themeId?: string | null) {
  return usesLegacyEditorialOverrideTable(themeId)
    ? { table: "editorial_overrides" }
    : { table: "theme_editorial_overrides" };
}
