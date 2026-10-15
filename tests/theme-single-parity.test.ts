import './setup.ts';
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { closeDb, sql } from '@aihot/backend/db';
import { upsertMaterial } from '@aihot/backend/content/materials';
import { publishArticle } from '@aihot/backend/publication/publish';
import { stopBoss } from '@aihot/backend/jobs/queue';
import { buildApp } from '../apps/api/src/app.ts';
import { smokePlan } from '../scripts/smoke.ts';
import { tag } from './setup.ts';

const T = tag();
const THEME = 'ai';
const SOURCE = `theme-single-parity-${T}`;
const app = await buildApp();

after(async () => {
  await app.close();
  await stopBoss();
  await closeDb();
});

before(async () => {
  await sql`INSERT INTO sources (id, name, kind, tier, participation_mode, next_fetch_at)
            VALUES (${SOURCE}, 'Theme parity source', 'rss', 'T1', 'editorial', '2100-01-01')`;
});

async function selectedArticle() {
  const { articleId } = await upsertMaterial({
    sourceId: SOURCE,
    url: `https://example.com/${T}`,
    title: `AI parity ${T}`,
    bodyText: 'Theme parity body',
    bodyHtml: '<p>Theme parity body</p>',
    bodyStatus: 'ok',
    via: 'fetch',
    publishedAt: new Date(),
  });
  await sql`INSERT INTO analyses (article_id, input_revision, origin, relevance, category, title_zh, summary_zh, score, selected)
            VALUES (${articleId}, 1, 'rule', 'pass', 'ai-models', ${`AI parity ${T}`}, ${`AI summary ${T}`}, 95, true)`;
  await publishArticle(articleId, { releasedAt: new Date(Date.now() - 60_000) });
  return articleId;
}

test('seeded ai theme reproduces the legacy single-theme public outputs', async () => {
  await selectedArticle();

  const rootRedirect = await app.inject({ method: 'GET', url: '/' });
  assert.equal(rootRedirect.statusCode, 302);
  assert.equal(rootRedirect.headers.location, '/ai');

  const [legacyFeed, themedFeed, legacyItems, themedItems, legacyStats, themedStats] = await Promise.all([
    app.inject({ method: 'GET', url: '/feed.xml' }),
    app.inject({ method: 'GET', url: `/${THEME}/feed.xml` }),
    app.inject({ method: 'GET', url: '/api/v1/items?mode=selected&limit=10' }),
    app.inject({ method: 'GET', url: `/api/v1/themes/${THEME}/items?mode=selected&limit=10` }),
    app.inject({ method: 'GET', url: '/api/site/stats' }),
    app.inject({ method: 'GET', url: `/api/site/themes/${THEME}/stats` }),
  ]);

  assert.equal(themedFeed.statusCode, 200, themedFeed.body);
  assert.equal(themedFeed.body, legacyFeed.body);
  assert.equal(themedItems.statusCode, 200, themedItems.body);
  assert.equal(themedItems.body, legacyItems.body);
  assert.equal(themedStats.statusCode, 200, themedStats.body);
  assert.equal(themedStats.body, legacyStats.body);
});

test('smoke planning accepts a theme-prefixed base route', () => {
  const plan = smokePlan('http://localhost:3000/ai');
  assert.equal(plan.themeId, 'ai');
  assert.ok(plan.pageUrls.includes('http://localhost:3000/ai'));
  assert.ok(plan.pageUrls.includes('http://localhost:3000/ai/daily'));
  assert.ok(plan.pageUrls.includes('http://localhost:3000/admin/login'));
  assert.ok(plan.machineTargets.some((target) => target.url === 'http://localhost:3000/api/v1/themes/ai/items'));
  assert.ok(plan.machineTargets.some((target) => target.url === 'http://localhost:3000/ai/feed.xml'));
  assert.equal(plan.mcpUrl, 'http://localhost:3000/api/mcp/ai');
});
