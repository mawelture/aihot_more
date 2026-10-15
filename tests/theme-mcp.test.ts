import './setup.ts';
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { closeDb, sql } from '@aihot/backend/db';
import { buildApp } from '../apps/api/src/app.ts';
import { upsertMaterial } from '@aihot/backend/content/materials';
import { publishArticle } from '@aihot/backend/publication/publish';
import { tag } from './setup.ts';
import { MCP_TOOL_NAMES } from '@aihot/contracts/mcp';

const T = tag();
const source = `theme-mcp-${T}`;
const app = await buildApp();
const publishedAt = new Date(Date.now() - 60 * 60 * 1000);
let sequence = 0;

before(async () => {
  await sql`INSERT INTO sources (id, name, kind, tier, participation_mode, next_fetch_at)
    VALUES (${source}, 'Theme MCP source', 'rss', 'T1', 'editorial', '2100-01-01')`;
});
after(async () => { await app.close(); await closeDb(); });

async function publishFor(themeId: 'ai' | 'finance', title: string) {
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
}

test('theme-prefixed MCP route exposes theme-scoped latest items', async () => {
  await publishFor('ai', `AI mcp ${T}`);
  await publishFor('finance', `Finance mcp ${T}`);

  const initialize = await app.inject({
    method: 'POST',
    url: '/api/mcp/finance',
    headers: { host: 'localhost', 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
    payload: { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'theme-test', version: '1.0.0' } } },
  });
  assert.equal(initialize.statusCode, 200, initialize.body);

  const call = await app.inject({
    method: 'POST',
    url: '/api/mcp/finance',
    headers: {
      host: 'localhost',
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      'mcp-protocol-version': '2026-07-28',
      'mcp-method': 'tools/call',
      'mcp-name': MCP_TOOL_NAMES.latest,
    },
    payload: {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: MCP_TOOL_NAMES.latest,
        arguments: { limit: 5 },
        _meta: {
          'io.modelcontextprotocol/protocolVersion': '2026-07-28',
          'io.modelcontextprotocol/clientCapabilities': {},
        },
      },
    },
  });
  assert.equal(call.statusCode, 200, call.body);
  assert.match(call.body, new RegExp(`Finance mcp ${T}`));
  assert.doesNotMatch(call.body, new RegExp(`AI mcp ${T}`));
});
