import './setup.ts';
import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { closeDb, sql } from '@aihot/backend/db';
import { latestHotRanking } from '@aihot/backend/publication/hot';
import { loadSiteStats } from '@aihot/backend/site/stats';
import { tag } from './setup.ts';

after(closeDb);

test('a cold read that finds nothing yet does not stick: later reads see the first published ranking', async () => {
  const themeId = `read-load-${tag()}`;
  const computedAt = new Date(Date.now() + 365 * 86400_000);
  const editorial = `editorial-${themeId}`;
  const signal = `signal-${themeId}`;
  const disabled = `disabled-${themeId}`;
  await sql`INSERT INTO sources (id, name, kind, participation_mode, enabled) VALUES
    (${editorial}, 'Editorial', 'rss', 'editorial', true),
    (${signal}, 'Signal', 'x_search', 'hot_signal', true),
    (${disabled}, 'Disabled', 'rss', 'editorial', false)`;
  await sql`
    INSERT INTO themes (id, name, path_prefix, enabled, is_default, pack_key)
    VALUES (${themeId}, 'Read load', ${themeId}, true, false, 'ai')
    ON CONFLICT (id) DO UPDATE
    SET enabled = true,
        updated_at = now()`;
  await sql`
    INSERT INTO theme_sources (theme_id, source_id, enabled)
    VALUES (${themeId}, ${editorial}, true), (${themeId}, ${signal}, true), (${themeId}, ${disabled}, false)
    ON CONFLICT (theme_id, source_id) DO UPDATE
    SET enabled = EXCLUDED.enabled,
        updated_at = now()`;
  const stats = await loadSiteStats(themeId);
  assert.deepEqual([stats.sources, stats.sourceKinds], [2, { rss: 1, x_search: 1 }]);
  await latestHotRanking(themeId);
  const [published] = await sql`INSERT INTO hot_rankings (theme_id, computed_at, rule_version, entries, published)
    VALUES (${themeId}, ${computedAt}, 'test', '[]', true) RETURNING id`;
  assert.equal((await latestHotRanking(themeId))?.id, published!.id);
});
