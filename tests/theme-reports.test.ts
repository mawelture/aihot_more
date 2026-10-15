import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

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
    reportScopeIdentity('finance', 'daily', '2026-10-10'),
  );
});

test('report theme migration adds theme_id to reports', () => {
  const reports = text('0068_reports_theme_scope.sql');
  assert.match(reports, /ALTER TABLE reports ADD COLUMN theme_id/i);
});

test('non-default themes store reports in dedicated theme report tables', async () => {
  const { reportStorageForTheme } = await import('../packages/backend/src/reports/compose.ts');
  assert.equal(reportStorageForTheme('ai').reportsTable, 'reports');
  assert.equal(reportStorageForTheme('finance').reportsTable, 'theme_reports');
  assert.equal(reportStorageForTheme('finance').revisionsTable, 'theme_report_revisions');
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
  assert.deepEqual(reportCorrectionStorageForTheme('finance'), {
    publicationsTable: 'theme_publications',
    reportsTable: 'theme_reports',
    revisionsTable: 'theme_report_revisions',
  });
});


test('scheduled report composition branches to theme-specific report storage', async () => {
  const { composeDueReportsScope } = await import('../packages/backend/src/reports/compose.ts');
  assert.deepEqual(composeDueReportsScope('ai'), { themeId: 'ai', reportsTable: 'reports' });
  assert.deepEqual(composeDueReportsScope('finance'), { themeId: 'finance', reportsTable: 'theme_reports' });
});




test('public report reads branch availability, cover, and report storage by theme', async () => {
  const { reportReadScope } = await import('../packages/backend/src/publication/reports.ts');
  assert.deepEqual(reportReadScope('ai'), {
    themeId: 'ai',
    publicationsTable: 'publications',
    reportsTable: 'reports',
  });
  assert.deepEqual(reportReadScope('finance'), {
    themeId: 'finance',
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
  assert.deepEqual(recallReadScope('finance'), {
    themeId: 'finance',
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
  assert.deepEqual(reportTaxonomyScope('finance'), {
    themeId: 'finance',
    defaultSection: '行业动态',
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
  assert.deepEqual(reportEditionScope('finance'), {
    themeId: 'finance',
    publicationsTable: 'theme_publications',
    reportsTable: 'theme_reports',
  });
});
