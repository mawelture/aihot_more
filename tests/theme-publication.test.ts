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

test('publication theme scope defaults to ai and distinguishes the same article across themes', async () => {
  const { themeIdOf } = await import('../packages/backend/src/publication/scope.ts');
  const { publicationIdentity } = await import('../packages/backend/src/publication/publish.ts');
  assert.equal(themeIdOf(undefined), 'ai');
  assert.deepEqual(publicationIdentity('ai', 'article-1'), { themeId: 'ai', articleId: 'article-1' });
  assert.notDeepEqual(publicationIdentity('ai', 'article-1'), publicationIdentity('finance', 'article-1'));
});

test('publication-ledger theme migrations add theme scope columns', () => {
  const publications = text('0065_publications_theme_scope.sql');
  const ledger = text('0069_selected_ledger_theme_scope.sql');
  assert.match(publications, /ALTER TABLE publications ADD COLUMN theme_id/i);
  assert.match(ledger, /ALTER TABLE selected_ledger ADD COLUMN theme_id/i);
});

test('shared pool-search storage keeps a default-theme scope column', () => {
  const poolSearch = text('0079_pool_search_theme_scope.sql');
  assert.match(poolSearch, /ALTER TABLE pool_search ADD COLUMN theme_id/i);
});

test('non-default themes store publication state in dedicated shadow tables', async () => {
  const { publicationStorageForTheme } = await import('../packages/backend/src/publication/storage.ts');
  assert.equal(publicationStorageForTheme('ai').publicationsTable, 'publications');
  assert.equal(publicationStorageForTheme('ai').selectedStateTable, 'selected_state');
  assert.equal(publicationStorageForTheme('ai').poolSearchTable, 'pool_search');
  assert.equal(publicationStorageForTheme('finance').publicationsTable, 'theme_publications');
  assert.equal(publicationStorageForTheme('finance').selectedStateTable, 'theme_selected_state');
  assert.equal(publicationStorageForTheme('finance').poolSearchTable, 'theme_pool_search');
});

test('theme publication shadow table migrations exist', () => {
  const publications = text('0072_create_theme_publications.sql');
  const selectedState = text('0073_create_theme_selected_state.sql');
  const poolSearch = text('0074_create_theme_pool_search.sql');
  assert.match(publications, /CREATE TABLE theme_publications/i);
  assert.match(publications, /theme_id/i);
  assert.match(selectedState, /CREATE TABLE theme_selected_state/i);
  assert.match(selectedState, /theme_id/i);
  assert.match(poolSearch, /CREATE TABLE theme_pool_search/i);
  assert.match(poolSearch, /theme_id/i);
});

test('selected-ledger scope keys default to ai and vary by theme', async () => {
  const { ledgerEpochSettingKey } = await import('../packages/backend/src/publication/v1.ts');
  assert.equal(ledgerEpochSettingKey(undefined), 'selected_ledger_epoch:ai');
  assert.equal(ledgerEpochSettingKey('finance'), 'selected_ledger_epoch:finance');
  assert.notEqual(ledgerEpochSettingKey('ai'), ledgerEpochSettingKey('finance'));
});


test('admin content publication correction and search branch to theme-specific publication storage', async () => {
  const { adminPublicationScope } = await import('../packages/backend/src/admin/content.ts');
  assert.deepEqual(adminPublicationScope('ai'), {
    themeId: 'ai',
    publicationsTable: 'publications',
  });
  assert.deepEqual(adminPublicationScope('finance'), {
    themeId: 'finance',
    publicationsTable: 'theme_publications',
  });
});


test('story and timeline publication reads branch to theme-specific publication and signal scope', async () => {
  const { storyReadScope } = await import('../packages/backend/src/publication/stories.ts');
  const { timelineReadScope } = await import('../packages/backend/src/publication/timeline.ts');
  assert.deepEqual(storyReadScope('ai'), {
    themeId: 'ai',
    publicationsTable: 'publications',
    signalsThemeScoped: false,
  });
  assert.deepEqual(storyReadScope('finance'), {
    themeId: 'finance',
    publicationsTable: 'theme_publications',
    signalsThemeScoped: true,
  });
  assert.deepEqual(timelineReadScope('ai'), {
    themeId: 'ai',
    publicationsTable: 'publications',
  });
  assert.deepEqual(timelineReadScope('finance'), {
    themeId: 'finance',
    publicationsTable: 'theme_publications',
  });
});


test('public hot read branches to theme-specific publication storage', async () => {
  const { publicHotScope } = await import('../packages/backend/src/publication/hot.ts');
  assert.deepEqual(publicHotScope('ai'), {
    themeId: 'ai',
    publicationsTable: 'publications',
  });
  assert.deepEqual(publicHotScope('finance'), {
    themeId: 'finance',
    publicationsTable: 'theme_publications',
  });
});


test('story text and topic reads branch to theme-specific publication storage', async () => {
  const { storyTextReadScope } = await import('../packages/backend/src/publication/story-text.ts');
  const { topicReadScope } = await import('../packages/backend/src/publication/topics.ts');
  assert.deepEqual(storyTextReadScope('ai'), {
    themeId: 'ai',
    publicationsTable: 'publications',
  });
  assert.deepEqual(storyTextReadScope('finance'), {
    themeId: 'finance',
    publicationsTable: 'theme_publications',
  });
  assert.deepEqual(topicReadScope('ai'), {
    themeId: 'ai',
    publicationsTable: 'publications',
  });
  assert.deepEqual(topicReadScope('finance'), {
    themeId: 'finance',
    publicationsTable: 'theme_publications',
  });
});


test('item-level public reads branch to theme-specific publication storage', async () => {
  const { itemReadScope } = await import('../packages/backend/src/publication/items.ts');
  assert.deepEqual(itemReadScope('ai'), {
    themeId: 'ai',
    publicationsTable: 'publications',
  });
  assert.deepEqual(itemReadScope('finance'), {
    themeId: 'finance',
    publicationsTable: 'theme_publications',
  });
});


test('site stats and rss item feeds branch to theme-specific publication/report storage', async () => {
  const { siteStatsReadScope } = await import('../packages/backend/src/site/stats.ts');
  const { feedReadScope } = await import('../packages/backend/src/publication/feeds.ts');
  assert.deepEqual(siteStatsReadScope('ai'), {
    themeId: 'ai',
    publicationsTable: 'publications',
    reportsTable: 'reports',
  });
  assert.deepEqual(siteStatsReadScope('finance'), {
    themeId: 'finance',
    publicationsTable: 'theme_publications',
    reportsTable: 'theme_reports',
  });
  assert.deepEqual(feedReadScope('ai'), {
    themeId: 'ai',
    publicationsTable: 'publications',
    reportsTable: 'reports',
  });
  assert.deepEqual(feedReadScope('finance'), {
    themeId: 'finance',
    publicationsTable: 'theme_publications',
    reportsTable: 'theme_reports',
  });
});


test('detail, pool, and sitemap reads branch to theme-specific publication/report storage', async () => {
  const { detailReadScope } = await import('../packages/backend/src/publication/detail.ts');
  const { poolReadScope } = await import('../packages/backend/src/publication/pool.ts');
  const { sitemapReadScope } = await import('../packages/backend/src/publication/sitemap.ts');
  assert.deepEqual(detailReadScope('ai'), {
    themeId: 'ai',
    publicationsTable: 'publications',
  });
  assert.deepEqual(detailReadScope('finance'), {
    themeId: 'finance',
    publicationsTable: 'theme_publications',
  });
  assert.deepEqual(poolReadScope('ai'), {
    themeId: 'ai',
    publicationsTable: 'publications',
    poolSearchTable: 'pool_search',
  });
  assert.deepEqual(poolReadScope('finance'), {
    themeId: 'finance',
    publicationsTable: 'theme_publications',
    poolSearchTable: 'theme_pool_search',
  });
  assert.deepEqual(sitemapReadScope('ai'), {
    themeId: 'ai',
    publicationsTable: 'publications',
    reportsTable: 'reports',
  });
  assert.deepEqual(sitemapReadScope('finance'), {
    themeId: 'finance',
    publicationsTable: 'theme_publications',
    reportsTable: 'theme_reports',
  });
});


test('availability, og, followups, and reading-group reads branch to theme-specific publication storage', async () => {
  const { availabilityReadScope } = await import('../packages/backend/src/publication/availability.ts');
  const { ogReadScope } = await import('../packages/backend/src/publication/og.ts');
  const { followupsReadScope } = await import('../packages/backend/src/publication/followups.ts');
  const { groupReportsReadScope } = await import('../packages/backend/src/publication/groups.ts');
  for (const [themeId, publicationsTable] of [['ai', 'publications'], ['finance', 'theme_publications']] as const) {
    assert.deepEqual(availabilityReadScope(themeId), { themeId, publicationsTable });
    assert.deepEqual(ogReadScope(themeId), { themeId, publicationsTable });
    assert.deepEqual(followupsReadScope(themeId), { themeId, publicationsTable });
    assert.deepEqual(groupReportsReadScope(themeId), { themeId, publicationsTable });
  }
});
