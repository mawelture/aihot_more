// Seeds demo sources from every enabled theme pack (themes/<theme>/sources.json). A source already in the
// database is left as the admin set it; a subscription already chosen is not turned back on. Each file
// subscribes its sources only to that theme. Topics need no seeding: each theme reads its own topics file.
// Re-runnable:  node --env-file=.env scripts/seed.ts
import { existsSync, readFileSync } from "node:fs";
import { closeDb, sql } from "@aihot/backend/db";
import { assertSupportedConfig } from "@aihot/backend/sources/config-keys";
import { planSeedThemeSources } from "@aihot/backend/themes/bootstrap";
import { listThemeDefinitions, themeSourcePath } from "../themes/index.ts";

interface SeedSource {
  id: string;
  name: string;
  kind: "rss" | "web_list" | "json_list" | "x_search" | "mp_account" | "external";
  config: Record<string, unknown>;
  tier?: string;
  owner_entity_id?: string | null;
  participation_mode?: string;
  interval_minutes?: number;
  tags?: string[];
  site_fulltext?: boolean;
  syndicate_fulltext?: boolean;
  enabled?: boolean;
}

let added = 0;
let subscribed = 0;
for (const theme of listThemeDefinitions()) {
  if (!theme.enabled) continue;
  const file = themeSourcePath(theme.id);
  if (!existsSync(file)) continue;
  const { sources } = JSON.parse(readFileSync(file, "utf8")) as { sources: SeedSource[] };
  let themeAdded = 0;
  for (const s of sources) {
    assertSupportedConfig(s.kind, s.config);
    const tier = s.tier ?? "T2";
    // First-party means a T1 source, as the admin sets it.
    const inserted = await sql`
      INSERT INTO sources (id, name, kind, config, tier, first_party, owner_entity_id, participation_mode, interval_minutes, tags, site_fulltext, syndicate_fulltext, enabled, next_fetch_at)
      VALUES (${s.id}, ${s.name}, ${s.kind}, ${sql.json(s.config as never)}, ${tier}, ${tier === "T1"}, ${s.owner_entity_id ?? null},
              ${s.participation_mode ?? "editorial"}, ${s.interval_minutes ?? 60}, ${s.tags ?? []}, ${s.site_fulltext ?? false}, ${s.syndicate_fulltext ?? false},
              ${s.enabled ?? true}, now())
      ON CONFLICT (id) DO NOTHING RETURNING id`;
    themeAdded += inserted.length;
  }
  let themeSubscribed = 0;
  for (const row of planSeedThemeSources(theme.id, sources)) {
    const inserted = await sql`
      INSERT INTO theme_sources (theme_id, source_id, enabled)
      VALUES (${row.themeId}, ${row.sourceId}, true)
      ON CONFLICT (theme_id, source_id) DO NOTHING
      RETURNING source_id`;
    themeSubscribed += inserted.length;
  }
  added += themeAdded;
  subscribed += themeSubscribed;
  console.log(`${theme.id}: ${themeAdded} sources added, ${sources.length - themeAdded} already there, ${themeSubscribed} subscriptions added`);
}
console.log(`sources added: ${added}; theme subscriptions added: ${subscribed}`);
await closeDb();
