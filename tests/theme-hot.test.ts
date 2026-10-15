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

test('hot rankings carry independent cache keys per theme', async () => {
  const { hotRankingScopeKey } = await import('../packages/backend/src/events/hot.ts');
  assert.equal(hotRankingScopeKey(undefined), 'hot:ai');
  assert.equal(hotRankingScopeKey('finance'), 'hot:finance');
  assert.notEqual(hotRankingScopeKey('ai'), hotRankingScopeKey('finance'));
});

test('story and fact theme migrations create theme membership tables', () => {
  const stories = text('0066_stories_theme_scope.sql');
  const facts = text('0067_facts_theme_scope.sql');
  assert.match(stories, /CREATE TABLE theme_stories/i);
  assert.match(facts, /CREATE TABLE theme_facts/i);
  assert.match(stories, /theme_id/i);
  assert.match(facts, /theme_id/i);
});

test('shared hot-ranking storage keeps a default-theme scope column', () => {
  const hotRankings = text('0078_hot_rankings_theme_scope.sql');
  assert.match(hotRankings, /ALTER TABLE hot_rankings ADD COLUMN theme_id/i);
});

test('event scope defaults to ai and non-default themes require dedicated memberships', async () => {
  const { eventScopeForTheme } = await import('../packages/backend/src/events/scope.ts');
  assert.equal(eventScopeForTheme(undefined).factsJoin, '');
  assert.equal(eventScopeForTheme('ai').storiesJoin, '');
  assert.match(eventScopeForTheme('finance').factsJoin, /theme_facts/i);
  assert.match(eventScopeForTheme('finance').storiesJoin, /theme_stories/i);
});

test('non-default themes store grouping state in dedicated shadow tables', async () => {
  const { groupingStorageForTheme } = await import('../packages/backend/src/events/storage.ts');
  assert.equal(groupingStorageForTheme('ai').decisionsTable, 'grouping_decisions');
  assert.equal(groupingStorageForTheme('ai').overridesTable, 'grouping_overrides');
  assert.equal(groupingStorageForTheme('finance').decisionsTable, 'theme_grouping_decisions');
  assert.equal(groupingStorageForTheme('finance').overridesTable, 'theme_grouping_overrides');
});

test('grouping shadow table migrations exist', () => {
  const decisions = text('0075_create_theme_grouping_decisions.sql');
  const overrides = text('0076_create_theme_grouping_overrides.sql');
  assert.match(decisions, /CREATE TABLE theme_grouping_decisions/i);
  assert.match(decisions, /theme_id/i);
  assert.match(overrides, /CREATE TABLE theme_grouping_overrides/i);
  assert.match(overrides, /theme_id/i);
});


test('manual grouping corrections branch to theme-specific publication and override storage', async () => {
  const { manualCorrectionScope } = await import('../packages/backend/src/events/corrections.ts');
  assert.deepEqual(manualCorrectionScope('ai'), {
    themeId: 'ai',
    publicationsTable: 'publications',
    overridesTable: 'grouping_overrides',
    decisionsTable: 'grouping_decisions',
  });
  assert.deepEqual(manualCorrectionScope('finance'), {
    themeId: 'finance',
    publicationsTable: 'theme_publications',
    overridesTable: 'theme_grouping_overrides',
    decisionsTable: 'theme_grouping_decisions',
  });
});


test('hot signal reads branch standalone overrides to theme-specific storage', async () => {
  const { hotSignalScope } = await import('../packages/backend/src/events/hot.ts');
  assert.deepEqual(hotSignalScope('ai'), {
    themeId: 'ai',
    publicationsTable: 'publications',
    overridesTable: 'grouping_overrides',
  });
  assert.deepEqual(hotSignalScope('finance'), {
    themeId: 'finance',
    publicationsTable: 'theme_publications',
    overridesTable: 'theme_grouping_overrides',
  });
});


test('hot extra text and cover reads branch to theme-specific publication and signal scope', async () => {
  const { hotAssetScope } = await import('../packages/backend/src/publication/hot.ts');
  const { heatSeriesScope } = await import('../packages/backend/src/events/hot.ts');
  assert.deepEqual(hotAssetScope('ai'), {
    themeId: 'ai',
    publicationsTable: 'publications',
    signalsThemeScoped: false,
  });
  assert.deepEqual(hotAssetScope('finance'), {
    themeId: 'finance',
    publicationsTable: 'theme_publications',
    signalsThemeScoped: true,
  });
  assert.deepEqual(heatSeriesScope('ai'), {
    themeId: 'ai',
    signalsThemeScoped: false,
  });
  assert.deepEqual(heatSeriesScope('finance'), {
    themeId: 'finance',
    signalsThemeScoped: true,
  });
});


test('signal-only queue planning fans out one grouping job per theme', async () => {
  const { planThemeSignalGroupJobs } = await import('../packages/backend/src/jobs/content.ts');
  assert.deepEqual(
    planThemeSignalGroupJobs('article-1', ['ai', 'finance']).map((job: any) => ({
      name: job.name,
      themeId: job.data.themeId,
      signalOnly: job.data.signalOnly,
      singletonKey: job.singletonKey,
    })),
    [
      { name: 'events.group', themeId: undefined, signalOnly: true, singletonKey: 'article-1' },
      { name: 'events.group', themeId: 'finance', signalOnly: true, singletonKey: 'group:signal:article-1:finance' },
    ],
  );
});


test('resetAutomatic limits non-default cleanup to theme-scoped memberships and signals', async () => {
  const { resetAutomaticScope } = await import('../packages/backend/src/events/group.ts');
  assert.deepEqual(resetAutomaticScope('ai'), {
    themeId: 'ai',
    factDeleteScope: 'global',
    signalDeleteScope: 'global',
  });
  assert.deepEqual(resetAutomaticScope('finance'), {
    themeId: 'finance',
    factDeleteScope: 'theme_facts',
    signalDeleteScope: 'theme_stories',
  });
});


test('story consolidation related-link reads branch to theme-specific decision storage', async () => {
  const { relatedStoryLinkScope } = await import('../packages/backend/src/events/consolidate.ts');
  assert.deepEqual(relatedStoryLinkScope('ai'), {
    themeId: 'ai',
    decisionsTable: 'grouping_decisions',
  });
  assert.deepEqual(relatedStoryLinkScope('finance'), {
    themeId: 'finance',
    decisionsTable: 'theme_grouping_decisions',
  });
});
