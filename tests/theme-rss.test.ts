import './setup.ts';
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { closeDb, sql } from '@aihot/backend/db';
import { buildApp } from '../apps/api/src/app.ts';
import { upsertMaterial } from '@aihot/backend/content/materials';
import { publishArticle } from '@aihot/backend/publication/publish';
import { tag } from './setup.ts';

const T = tag();
const source = `theme-rss-${T}`;
const app = await buildApp();
const publishedAt = new Date(Date.now() - 60_000);
let sequence = 0;

before(async () => {
  await sql`INSERT INTO sources (id, name, kind, tier, participation_mode, next_fetch_at)
    VALUES (${source}, 'Theme RSS source', 'rss', 'T1', 'editorial', '2100-01-01')`;
  await sql`INSERT INTO theme_sources (theme_id, source_id, enabled)
    VALUES ('ai', ${source}, true), ('macro', ${source}, true)
    ON CONFLICT (theme_id, source_id) DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = now()`;
});
after(async () => { await app.close(); await closeDb(); });

async function publishFor(themeId: 'ai' | 'macro', title: string) {
  const { articleId } = await upsertMaterial({
    sourceId: source,
    url: `https://example.com/${T}/${themeId}/${++sequence}`,
    title,
    bodyText: `${title} body`,
    bodyHtml: `<p>${title} body</p>`,
    bodyStatus: 'ok',
    via: 'fetch',
    publishedAt,
  });
  await sql`UPDATE articles SET grouping_status = 'complete' WHERE id = ${articleId}`;
  await sql`INSERT INTO analyses (theme_id, article_id, input_revision, origin, relevance, category, title_zh, summary_zh, score, selected)
    VALUES (${themeId}, ${articleId}, 1, 'rule', 'pass', 'industry', ${title}, ${`${title} summary`}, 90, true)`;
  await publishArticle(articleId, { themeId, releasedAt: publishedAt });
  return articleId;
}

test('theme-prefixed RSS item feeds do not leak cross-theme content', async () => {
  await publishFor('ai', `AI feed ${T}`);
  await publishFor('macro', `Finance feed ${T}`);

  const ai = await app.inject({ method: 'GET', url: '/ai/feed.xml' });
  const finance = await app.inject({ method: 'GET', url: '/macro/feed.xml' });

  assert.equal(ai.statusCode, 200, ai.body);
  assert.equal(finance.statusCode, 200, finance.body);
  assert.match(ai.body, new RegExp(`AI feed ${T}`));
  assert.doesNotMatch(ai.body, new RegExp(`Finance feed ${T}`));
  assert.match(finance.body, new RegExp(`Finance feed ${T}`));
  assert.doesNotMatch(finance.body, new RegExp(`AI feed ${T}`));
});
