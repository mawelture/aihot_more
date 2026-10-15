import { DEFAULT_THEME_ID } from "../../../../themes/index.ts";
import { config } from "../config.ts";
import { sql, type Db } from "../db.ts";

export async function currentDefaultThemeId(db: Db = sql): Promise<string> {
  const [row] = await db<{ id: string }[]>`
    SELECT id FROM themes WHERE enabled AND is_default ORDER BY updated_at DESC, id LIMIT 1`;
  return row?.id ?? config.defaultThemeId ?? DEFAULT_THEME_ID;
}
