import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { editionAt, sql, tag } from './setup.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const migration = (name: string) => path.join(ROOT, 'database/migrations', name);

function text(name: string): string {
  const file = migration(name);
  assert.equal(existsSync(file), true, `${name} should exist`);
  return readFileSync(file, 'utf8');
}

test('report scope identity defaults to ai and keeps issue keys independent per theme', async () => {
  const { reportScopeIdentity } = await import('../packages/backend/src/reports/compose.ts');
  assert.deepEqual(reportScopeIdentity(undefined, 'daily', '2026-10-10'), { themeId: 'ai', kind: 'daily', key: '2026-10-10' });
  assert.notDeepEqual(
    reportScopeIdentity('ai', 'daily', '2026-10-10'),
    reportScopeIdentity('macro', 'daily', '2026-10-10'),
  );
});

test('report theme migration adds theme_id to reports', () => {
  const reports = text('0068_reports_theme_scope.sql');
  assert.match(reports, /ALTER TABLE reports ADD COLUMN theme_id/i);
});

test('non-default themes store reports in dedicated theme report tables', async () => {
  const { reportStorageForTheme } = await import('../packages/backend/src/reports/compose.ts');
  assert.equal(reportStorageForTheme('ai').reportsTable, 'reports');
  assert.equal(reportStorageForTheme('macro').reportsTable, 'theme_reports');
  assert.equal(reportStorageForTheme('macro').revisionsTable, 'theme_report_revisions');
});

test('theme report shadow table migrations exist', () => {
  const reports = text('0070_create_theme_reports.sql');
  const revisions = text('0071_create_theme_report_revisions.sql');
  assert.match(reports, /CREATE TABLE theme_reports/i);
  assert.match(reports, /theme_id/i);
  assert.match(revisions, /CREATE TABLE theme_report_revisions/i);
});


test('report classification corrections branch to theme-specific publication and report storage', async () => {
  const { reportCorrectionStorageForTheme } = await import('../packages/backend/src/reports/correct.ts');
  assert.deepEqual(reportCorrectionStorageForTheme('ai'), {
    publicationsTable: 'publications',
    reportsTable: 'reports',
    revisionsTable: 'report_revisions',
  });
  assert.deepEqual(reportCorrectionStorageForTheme('macro'), {
    publicationsTable: 'theme_publications',
    reportsTable: 'theme_reports',
    revisionsTable: 'theme_report_revisions',
  });
});


test('scheduled report composition branches to theme-specific report storage', async () => {
  const { composeDueReportsScope } = await import('../packages/backend/src/reports/compose.ts');
  assert.deepEqual(composeDueReportsScope('ai'), { themeId: 'ai', reportsTable: 'reports' });
  assert.deepEqual(composeDueReportsScope('macro'), { themeId: 'macro', reportsTable: 'theme_reports' });
});




test('public report reads branch availability, cover, and report storage by theme', async () => {
  const { reportReadScope } = await import('../packages/backend/src/publication/reports.ts');
  assert.deepEqual(reportReadScope('ai'), {
    themeId: 'ai',
    publicationsTable: 'publications',
    reportsTable: 'reports',
  });
  assert.deepEqual(reportReadScope('macro'), {
    themeId: 'macro',
    publicationsTable: 'theme_publications',
    reportsTable: 'theme_reports',
  });
});

test('recall candidate reads branch representative and root-fact lookups by theme', async () => {
  const { recallReadScope } = await import('../packages/backend/src/events/recall.ts');
  assert.deepEqual(recallReadScope('ai'), {
    themeId: 'ai',
    publicationsTable: 'publications',
  });
  assert.deepEqual(recallReadScope('macro'), {
    themeId: 'macro',
    publicationsTable: 'theme_publications',
  });
});

test('report edition taxonomy helpers are loaded through the theme pack', async () => {
  const { reportTaxonomyScope } = await import('../packages/backend/src/reports/edition.ts');
  assert.deepEqual(reportTaxonomyScope('ai'), {
    themeId: 'ai',
    defaultSection: '行业动态',
    hasCommentary: true,
  });
  assert.deepEqual(reportTaxonomyScope('macro'), {
    themeId: 'macro',
    defaultSection: '公司与行业',
    hasCommentary: true,
  });
});
test('report edition candidates branch to theme-specific publication and report storage', async () => {
  const { reportEditionScope } = await import('../packages/backend/src/reports/edition.ts');
  assert.deepEqual(reportEditionScope('ai'), {
    themeId: 'ai',
    publicationsTable: 'publications',
    reportsTable: 'reports',
  });
  assert.deepEqual(reportEditionScope('macro'), {
    themeId: 'macro',
    publicationsTable: 'theme_publications',
    reportsTable: 'theme_reports',
  });
});

test('scheduled reports are composed for every enabled theme', async () => {
  const sourceId = `report-themes-${tag()}`;
  const articleId = `report-themes-a-${tag()}`;
  const date = '2024-06-04';
  const at = editionAt('daily', date, -12 * 3600);
  const now = editionAt('daily', date, 3600);
  const url = `https://example.com/${articleId}`;
  await sql`INSERT INTO sources (id, name, kind, tier) VALUES (${sourceId}, 'Report themes', 'rss', 'T1')`;
  await sql`INSERT INTO articles (id, source_id, identity_key, url, title, discovered_at, timeline_at)
    VALUES (${articleId}, ${sourceId}, ${articleId}, ${url}, '宏观样本', ${at}, ${at})`;
  await sql`INSERT INTO theme_publications (theme_id, article_id, title, source_id, channel, url, discovered_at, timeline_at, sort_at, eligible, selected, visible_after, visibility, score)
    VALUES ('macro', ${articleId}, '宏观样本', ${sourceId}, 'news', ${url}, ${at}, ${at}, ${at}, true, true, ${at}, 'public', 90)`;
  const { composeEnabledDueReports } = await import('../packages/backend/src/reports/compose.ts');
  try {
    await sql`UPDATE themes SET enabled = false WHERE id = 'web3'`;
    await assert.rejects(composeEnabledDueReports(now), (error: Error) => {
      assert.match(error.message, /^reports: /);
      assert.match(error.message, /ai \(/);
      assert.match(error.message, /macro \(weekly:.*failed; daily:2024-06-04 written\)/);
      assert.match(error.message, /quant \(/);
      assert.doesNotMatch(error.message, /web3/);
      return true;
    });
    const rows = await sql<{ theme_id: string; kind: string; key: string }[]>`
      SELECT theme_id, kind, key FROM theme_reports ORDER BY theme_id, kind, key`;
    assert.deepEqual(rows.map((row) => ({ theme_id: row.theme_id, kind: row.kind, key: row.key })), [
      { theme_id: 'macro', kind: 'daily', key: date },
    ]);
    assert.equal((await sql`SELECT 1 FROM reports`).length, 0);
  } finally {
    await sql`UPDATE themes SET enabled = true WHERE id = 'web3'`;
    await sql`DELETE FROM theme_reports WHERE theme_id = 'macro' AND key = ${date}`;
    await sql`DELETE FROM articles WHERE id = ${articleId}`;
    await sql`DELETE FROM sources WHERE id = ${sourceId}`;
  }
});
