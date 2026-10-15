import { DEFAULT_THEME_ID } from "../../../../themes/index.ts";
import { themeIdOf } from "./scope.ts";

export function usesLegacyPublicationTables(themeId?: string | null): boolean {
  return themeIdOf(themeId) === DEFAULT_THEME_ID;
}

export function publicationStorageForTheme(themeId?: string | null) {
  return usesLegacyPublicationTables(themeId)
    ? {
        publicationsTable: "publications",
        selectedStateTable: "selected_state",
        poolSearchTable: "pool_search",
      }
    : {
        publicationsTable: "theme_publications",
        selectedStateTable: "theme_selected_state",
        poolSearchTable: "theme_pool_search",
      };
}
