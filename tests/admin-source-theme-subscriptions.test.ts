import './setup.ts';
import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { closeDb, sql } from '@aihot/backend/db';
import { Conflict } from '@aihot/backend/audit';
import { deleteSource, listSources, sourceDetail, setSourceThemeSubscription } from '@aihot/backend/admin/sources';
import { stopBoss } from '@aihot/backend/jobs/queue';
import { tag } from './setup.ts';

const T = tag();

after(async () => {
  await stopBoss();
  await closeDb();
});

async function resetThemeState() {
  await sql`UPDATE themes SET enabled = CASE WHEN id IN ('ai', 'macro') THEN true ELSE enabled END WHERE id IN ('ai', 'macro')`;
}

async function insertSource(sourceId: string) {
  await sql`
    INSERT INTO sources (id, name, kind, tier, participation_mode, next_fetch_at)
    VALUES (${sourceId}, 'Shared source', 'rss', 'T1', 'editorial', now())
    ON CONFLICT (id) DO NOTHING`;
}

test('admin source detail shows which themes subscribe to the source', async () => {
  await resetThemeState();
  const sourceId = `theme-source-detail-${T}`;
  const disabledThemeId = `disabled-theme-${T}`;
  await insertSource(sourceId);
  await sql`
    INSERT INTO themes (id, name, path_prefix, enabled, is_default, pack_key)
    VALUES (${disabledThemeId}, 'Disabled theme', ${disabledThemeId}, false, false, 'macro')
    ON CONFLICT (id) DO UPDATE
    SET enabled = false,
        updated_at = now()`;
  await sql`
    INSERT INTO theme_sources (theme_id, source_id, enabled) VALUES ('ai', ${sourceId}, true), ('macro', ${sourceId}, false)
    ON CONFLICT (theme_id, source_id) DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = now()`;

  const detail = await sourceDetail(sourceId);
  assert.ok(detail);
  const themes = new Map(detail!.themes.map((theme) => [theme.id, { subscribed: theme.subscribed, enabled: theme.enabled }]));
  assert.deepEqual(themes.get('ai'), { subscribed: true, enabled: true });
  assert.deepEqual(themes.get('macro'), { subscribed: false, enabled: true });
  assert.equal(themes.has(disabledThemeId), false, 'disabled themes stay hidden from the subscription picker');
});

test('admin can subscribe and unsubscribe a source per theme without deleting history rows', async () => {
  await resetThemeState();
  const sourceId = `theme-source-subscribe-${T}`;
  await insertSource(sourceId);
  const actor = `test-admin-${T}`;
  await setSourceThemeSubscription(sourceId, 'macro', true, '订阅 finance', actor);
  let [row] = await sql<{ enabled: boolean }[]>`SELECT enabled FROM theme_sources WHERE theme_id = 'macro' AND source_id = ${sourceId}`;
  assert.equal(row?.enabled, true);

  await setSourceThemeSubscription(sourceId, 'macro', false, '取消 finance', actor);
  [row] = await sql<{ enabled: boolean }[]>`SELECT enabled FROM theme_sources WHERE theme_id = 'macro' AND source_id = ${sourceId}`;
  assert.equal(row?.enabled, false);

  const detail = await sourceDetail(sourceId);
  assert.equal(detail?.themes.find((theme) => theme.id === 'macro')?.subscribed, false);
  const rows = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM theme_sources WHERE theme_id = 'macro' AND source_id = ${sourceId}`;
  assert.equal(rows[0]?.n, 1);
});

test('admin can delete a source that has no articles', async () => {
  const sourceId = `theme-source-delete-${T}`;
  await insertSource(sourceId);
  await sql`INSERT INTO fetch_runs (source_id, status) VALUES (${sourceId}, 'failed')`;
  const actor = `test-admin-${T}`;
  const deleted = await deleteSource(sourceId, '没有文章', actor);
  assert.deepEqual(deleted, { id: sourceId });
  const left = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM sources WHERE id = ${sourceId}`;
  assert.equal(left[0]?.n, 0);
  const runs = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM fetch_runs WHERE source_id = ${sourceId}`;
  assert.equal(runs[0]?.n, 0);
  const subs = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM theme_sources WHERE source_id = ${sourceId}`;
  assert.equal(subs[0]?.n, 0);
  const audit = await sql<{ action: string }[]>`SELECT action FROM audit_log WHERE subject = ${`source:${sourceId}`} AND action = 'source.delete'`;
  assert.equal(audit[0]?.action, 'source.delete');
});

test('admin cannot delete a source that already has an article', async () => {
  const sourceId = `theme-source-keep-${T}`;
  await insertSource(sourceId);
  await sql`
    INSERT INTO articles (id, source_id, identity_key, url, title, discovered_at, timeline_at)
    VALUES (${`${sourceId}-a`}, ${sourceId}, ${`${sourceId}-key`}, 'https://example.com/a', 'kept', now(), now())`;
  await assert.rejects(() => deleteSource(sourceId, '想删掉', `test-admin-${T}`), Conflict);
  const left = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM sources WHERE id = ${sourceId}`;
  assert.equal(left[0]?.n, 1);
});

test('source list shows the themes that subscribe to each source', async () => {
  const sourceId = `theme-source-list-${T}`;
  await insertSource(sourceId);
  await setSourceThemeSubscription(sourceId, 'macro', true, '订阅 finance', `test-admin-${T}`);
  const subscribed = await listSources({ q: sourceId });
  const row = subscribed.rows.find((item) => item.id === sourceId);
  assert.deepEqual(row?.themes, [
    { id: 'macro', name: '宏观' },
    { id: 'ai', name: 'AI' },
  ]);

  await setSourceThemeSubscription(sourceId, 'ai', false, '取消 ai', `test-admin-${T}`);
  const financeOnly = await listSources({ q: sourceId });
  assert.deepEqual(financeOnly.rows.find((item) => item.id === sourceId)?.themes, [{ id: 'macro', name: '宏观' }]);
});
