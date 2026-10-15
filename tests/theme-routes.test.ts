import './setup.ts';
import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { closeDb } from '@aihot/backend/db';
import { buildApp } from '../apps/api/src/app.ts';

const app = await buildApp();
after(async () => { await app.close(); await closeDb(); });

test('root redirects to the configured default theme', async () => {
  const res = await app.inject({ method: 'GET', url: '/' });
  assert.equal(res.statusCode, 302, res.body);
  assert.equal(res.headers.location, '/ai');
});

test('theme-prefixed site and static public endpoints are served', async () => {
  const stats = await app.inject({ method: 'GET', url: '/api/site/themes/ai/stats' });
  assert.equal(stats.statusCode, 200, stats.body);

  const openapi = await app.inject({ method: 'GET', url: '/finance/openapi-v1.json' });
  assert.equal(openapi.statusCode, 200, openapi.body);
  assert.match(openapi.body, /\/api\/v1\/themes\/\{theme\}\/items/);

  const llms = await app.inject({ method: 'GET', url: '/finance/llms.txt' });
  assert.equal(llms.statusCode, 200, llms.body);
});
