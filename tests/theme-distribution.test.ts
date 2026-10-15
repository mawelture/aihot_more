import assert from 'node:assert/strict';
import test from 'node:test';

test('one collected article is distributed to every subscribed theme once', async () => {
  const { planThemeArticleRows, planThemeAnalyzeJobs } = await import('../packages/backend/src/themes/distribution.ts');
  const rows = planThemeArticleRows('article-1', 'shared-source', [
    { theme_id: 'ai', source_id: 'shared-source', enabled: true },
    { theme_id: 'finance', source_id: 'shared-source', enabled: true },
    { theme_id: 'ai', source_id: 'shared-source', enabled: true },
  ]);
  assert.deepEqual(rows.map((row) => row.themeId), ['ai', 'finance']);
  const jobs = planThemeAnalyzeJobs('article-1', rows.map((row) => row.themeId));
  assert.deepEqual(jobs.map((job) => [job.data.themeId, job.singletonKey]), [
    [undefined, 'article-1'],
    ['finance', 'theme:finance:article-1'],
  ]);
});

test('editorial grouping keeps the default theme key and gives other themes their own', async () => {
  const { groupQueuePayload, groupSingletonKey } = await import('../packages/backend/src/themes/distribution.ts');
  assert.deepEqual(groupQueuePayload('article-1', 'ai'), { articleId: 'article-1' });
  assert.equal(groupSingletonKey('article-1', 'ai'), 'article-1');
  assert.deepEqual(groupQueuePayload('article-1', 'finance'), { articleId: 'article-1', themeId: 'finance' });
  assert.equal(groupSingletonKey('article-1', 'finance'), 'group:finance:article-1');
});
