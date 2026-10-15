import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = path.resolve(import.meta.dirname, '..');

test('unsubscribe stops future distribution but keeps historical theme articles', async () => {
  const { planThemeArticleRows } = await import('../packages/backend/src/themes/distribution.ts');
  const before = planThemeArticleRows('article-before', 'shared-source', [
    { theme_id: 'ai', source_id: 'shared-source', enabled: true },
    { theme_id: 'finance', source_id: 'shared-source', enabled: true },
  ]);
  const after = planThemeArticleRows('article-after', 'shared-source', [
    { theme_id: 'ai', source_id: 'shared-source', enabled: true },
    { theme_id: 'finance', source_id: 'shared-source', enabled: false },
  ]);
  assert.ok(before.some((row) => row.themeId === 'finance' && row.articleId === 'article-before'));
  assert.ok(!after.some((row) => row.themeId === 'finance' && row.articleId === 'article-after'));
});

test('theme article migration defines the distribution table', () => {
  const file = path.join(ROOT, 'database/migrations/0062_create_theme_articles.sql');
  assert.equal(existsSync(file), true, '0062_create_theme_articles.sql should exist');
  const text = readFileSync(file, 'utf8');
  assert.match(text, /CREATE TABLE theme_articles/i);
  assert.match(text, /theme_id/i);
  assert.match(text, /article_id/i);
  assert.match(text, /source_id/i);
});
