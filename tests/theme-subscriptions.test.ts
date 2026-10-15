import './setup.ts';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test, { after } from 'node:test';
import { closeDb, sql } from '@aihot/backend/db';
import { stopBoss } from '@aihot/backend/jobs/queue';
import { tag } from './setup.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const migration = (name: string) => path.join(ROOT, 'database/migrations', name);

function text(name: string): string {
  const file = migration(name);
  assert.equal(existsSync(file), true, `${name} should exist`);
  return readFileSync(file, 'utf8');
}

test('seed imports each enabled theme pack and subscribes that pack to itself', async () => {
  const seed = readFileSync(path.join(ROOT, 'scripts/seed.ts'), 'utf8');
  assert.match(seed, /listThemeDefinitions/);
  assert.match(seed, /themeSourcePath\(theme\.id\)/);
  assert.match(seed, /planSeedThemeSources\(theme\.id, sources\)/);
  const { listThemeDefinitions, themeSourcePath } = await import('../themes/index.ts');
  const enabled = listThemeDefinitions().filter((theme) => theme.enabled);
  assert.ok(enabled.some((theme) => theme.id === 'finance'));
  for (const theme of enabled) assert.equal(existsSync(themeSourcePath(theme.id)), true, theme.id);
  const finance = JSON.parse(readFileSync(themeSourcePath('finance'), 'utf8')) as { sources: Array<{ id: string }> };
  assert.ok(finance.sources.some((source) => source.id === 'rss-cls-telegraph'));
});

test('theme schema migrations define themes and theme_sources tables', () => {
  const createThemes = text('0058_create_themes.sql');
  const createThemeSources = text('0059_create_theme_sources.sql');
  assert.match(createThemes, /CREATE TABLE themes/i);
  assert.match(createThemes, /is_default/i);
  assert.match(createThemes, /pack_key/i);
  assert.match(createThemeSources, /CREATE TABLE theme_sources/i);
  assert.match(createThemeSources, /theme_id/i);
  assert.match(createThemeSources, /source_id/i);
});

const T = tag();

after(async () => {
  await stopBoss();
  await closeDb();
});

test('seed planner installs ai as the default theme and subscribes enabled sources', async () => {
  const { SEEDED_THEMES, planSeedThemeSources } = await import('../packages/backend/src/themes/bootstrap.ts');
  assert.ok(SEEDED_THEMES.some((theme) => theme.id === 'ai' && theme.isDefault));
  assert.deepEqual(planSeedThemeSources('ai', [
    { id: 'source-a', enabled: true },
    { id: 'source-b', enabled: false },
    { id: 'source-c' },
  ]), [
    { themeId: 'ai', sourceId: 'source-a' },
    { themeId: 'ai', sourceId: 'source-c' },
  ]);
});

test('restart leaves a finance-only source alone and does not turn a cancelled AI subscription back on', async () => {
  const { ensureSeedThemes } = await import('../packages/backend/src/themes/bootstrap.ts');
  const financeOnly = `finance-only-${T}`;
  const cancelled = `ai-off-${T}`;
  const fresh = `unassigned-${T}`;
  for (const id of [financeOnly, cancelled, fresh]) {
    await sql`
      INSERT INTO sources (id, name, kind, tier, participation_mode, next_fetch_at)
      VALUES (${id}, ${id}, 'rss', 'T2', 'editorial', now())`;
  }
  await sql`DELETE FROM theme_sources WHERE source_id IN (${financeOnly}, ${cancelled}, ${fresh})`;
  await sql`INSERT INTO theme_sources (theme_id, source_id, enabled) VALUES ('finance', ${financeOnly}, true)`;
  await sql`INSERT INTO theme_sources (theme_id, source_id, enabled) VALUES ('ai', ${cancelled}, false)`;

  await ensureSeedThemes(sql);

  const rows = await sql<{ theme_id: string; source_id: string; enabled: boolean }[]>`
    SELECT theme_id, source_id, enabled FROM theme_sources
    WHERE source_id IN (${financeOnly}, ${cancelled}, ${fresh})
    ORDER BY source_id, theme_id`;
  assert.deepEqual(rows.map((row) => ({ theme_id: row.theme_id, source_id: row.source_id, enabled: row.enabled })), [
    { theme_id: 'ai', source_id: cancelled, enabled: false },
    { theme_id: 'finance', source_id: financeOnly, enabled: true },
  ]);
});

test('an unsubscribed source is not judged or published as the default theme', async () => {
  const { upsertMaterial } = await import('@aihot/backend/content/materials');
  const { processArticle, queueProcessing } = await import('@aihot/backend/jobs/content');
  const { publishArticle, retractUnassignedPublications } = await import('@aihot/backend/publication/publish');
  const { QUEUES } = await import('@aihot/backend/jobs/queue');
  const financeSource = `only-finance-${T}`;
  const noneSource = `no-theme-${T}`;
  for (const id of [financeSource, noneSource]) {
    await sql`
      INSERT INTO sources (id, name, kind, tier, participation_mode, next_fetch_at)
      VALUES (${id}, ${id}, 'rss', 'T2', 'editorial', now())`;
  }
  await sql`DELETE FROM theme_sources WHERE source_id IN (${financeSource}, ${noneSource})`;
  await sql`INSERT INTO theme_sources (theme_id, source_id, enabled) VALUES ('finance', ${financeSource}, true)`;

  const body = "A quantitative strategy report with enough text to be an article. ".repeat(4);
  const { articleId: financeArticle } = await upsertMaterial({
    sourceId: financeSource, url: `https://example.com/${T}/finance`, title: `Quant note ${T}`,
    bodyText: body, bodyStatus: "ok", via: "fetch", publishedAt: new Date(),
  });
  const financeJob = await queueProcessing(financeArticle);
  assert.ok(financeJob);
  const [queued] = await sql<{ name: string; data: { themeId?: string } }[]>`
    SELECT name, data FROM pgboss.job WHERE id = ${financeJob}`;
  assert.deepEqual([queued?.name, queued?.data.themeId], [QUEUES.analyze, "finance"]);

  const { articleId: noneArticle } = await upsertMaterial({
    sourceId: noneSource, url: `https://example.com/${T}/none`, title: `Unassigned ${T}`,
    bodyText: body, bodyStatus: "ok", via: "fetch", publishedAt: new Date(),
  });
  assert.equal(await queueProcessing(noneArticle), null);
  assert.equal((await processArticle(noneArticle)).state, "unsubscribed");
  const [parked] = await sql<{ processing_state: string; processing_error: string | null }[]>`
    SELECT processing_state, processing_error FROM articles WHERE id = ${noneArticle}`;
  assert.deepEqual([parked?.processing_state, parked?.processing_error], ["skipped", "no theme subscription"]);
  assert.equal((await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM publications WHERE article_id = ${noneArticle}`)[0]?.n, 0);

  await publishArticle(noneArticle);
  assert.equal((await sql<{ visibility: string }[]>`SELECT visibility FROM publications WHERE article_id = ${noneArticle}`)[0]?.visibility, "public");
  assert.ok(await retractUnassignedPublications() >= 1);
  assert.equal((await sql<{ visibility: string }[]>`SELECT visibility FROM publications WHERE article_id = ${noneArticle}`)[0]?.visibility, "withdrawn");
});

test('re-evaluation follows the subscribed theme and leaves an unsubscribed article untouched', async () => {
  const { rerun } = await import('@aihot/backend/admin/content');
  const { upsertMaterial } = await import('@aihot/backend/content/materials');
  const { QUEUES } = await import('@aihot/backend/jobs/queue');
  const financeSource = `reeval-finance-${T}`;
  const noneSource = `reeval-none-${T}`;
  for (const id of [financeSource, noneSource]) {
    await sql`
      INSERT INTO sources (id, name, kind, tier, participation_mode, next_fetch_at)
      VALUES (${id}, ${id}, 'rss', 'T2', 'editorial', now())`;
  }
  await sql`DELETE FROM theme_sources WHERE source_id IN (${financeSource}, ${noneSource})`;
  await sql`INSERT INTO theme_sources (theme_id, source_id, enabled) VALUES ('finance', ${financeSource}, true)`;
  const body = "A quantitative strategy report with enough text to be an article. ".repeat(4);
  const { articleId: financeArticle } = await upsertMaterial({
    sourceId: financeSource, url: `https://example.com/${T}/reeval-finance`, title: `Quant note ${T}`,
    bodyText: body, bodyStatus: "ok", via: "fetch", publishedAt: new Date(),
  });
  await sql`UPDATE articles SET processing_state = 'analyzed' WHERE id = ${financeArticle}`;
  const result = await rerun(financeArticle, "analyze", `reeval-${T}`, "test");
  assert.ok(result?.jobId);
  const [job] = await sql<{ name: string; data: { themeId?: string; attemptTag?: string } }[]>`
    SELECT name, data FROM pgboss.job WHERE id = ${result.jobId}`;
  assert.deepEqual([job?.name, job?.data.themeId, job?.data.attemptTag], [QUEUES.analyze, "finance", `admin:reeval-${T}`]);
  const [reset] = await sql<{ processing_state: string; processing_error: string | null }[]>`
    SELECT processing_state, processing_error FROM articles WHERE id = ${financeArticle}`;
  assert.deepEqual([reset?.processing_state, reset?.processing_error], ["new", null]);

  const { articleId: noneArticle } = await upsertMaterial({
    sourceId: noneSource, url: `https://example.com/${T}/reeval-none`, title: `Unassigned ${T}`,
    bodyText: body, bodyStatus: "ok", via: "fetch", publishedAt: new Date(),
  });
  await sql`UPDATE articles SET processing_state = 'analyzed', processing_error = NULL WHERE id = ${noneArticle}`;
  await assert.rejects(() => rerun(noneArticle, "analyze", `reeval-none-${T}`, "test"), { code: "conflict" });
  const [kept] = await sql<{ processing_state: string; processing_error: string | null }[]>`
    SELECT processing_state, processing_error FROM articles WHERE id = ${noneArticle}`;
  assert.deepEqual([kept?.processing_state, kept?.processing_error], ["analyzed", null]);
});
