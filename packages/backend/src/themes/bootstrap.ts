import type { Db } from "../db.ts";
import { sql } from "../db.ts";
import { listThemeDefinitions } from "../../../../themes/index.ts";

export interface SeededThemeRow {
  id: string;
  name: string;
  pathPrefix: string;
  packKey: string;
  enabled: boolean;
  isDefault: boolean;
}

export interface SeedableSource {
  id: string;
  enabled?: boolean;
}

export const SEEDED_THEMES: readonly SeededThemeRow[] = listThemeDefinitions().map((theme) => ({
  id: theme.id,
  name: theme.name,
  pathPrefix: theme.id,
  packKey: theme.id,
  enabled: theme.enabled,
  isDefault: theme.isDefault,
}));

export function planSeedThemeSources(themeId: string, sources: ReadonlyArray<SeedableSource>): Array<{ themeId: string; sourceId: string }> {
  return sources.filter((source) => source.enabled !== false).map((source) => ({ themeId, sourceId: source.id }));
}

export async function ensureSeedThemes(db: Db = sql): Promise<void> {
  for (const theme of SEEDED_THEMES) {
    await db`
      INSERT INTO themes (id, name, path_prefix, enabled, is_default, pack_key)
      VALUES (${theme.id}, ${theme.name}, ${theme.pathPrefix}, ${theme.enabled}, ${theme.isDefault}, ${theme.packKey})
      ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name,
          path_prefix = EXCLUDED.path_prefix,
          enabled = EXCLUDED.enabled,
          is_default = EXCLUDED.is_default,
          pack_key = EXCLUDED.pack_key,
          updated_at = now()`;
  }
}
