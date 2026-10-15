import './setup.ts';
import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { closeDb, sql } from '@aihot/backend/db';
import { stopBoss } from '@aihot/backend/jobs/queue';
import { splitFinanceTheme } from '../scripts/split-finance-theme.ts';
import { tag } from './setup.ts';

const T = tag();

after(async () => {
  await stopBoss();
  await closeDb();
});

test('splitting finance moves each source set and drops the old theme', async () => {
  await sql`
    INSERT INTO themes (id, name, path_prefix, enabled, is_default, pack_key)
    VALUES ('finance', 'Finance', 'finance', true, false, 'finance')
    ON CONFLICT (id) DO NOTHING`;
  const sources = [
    ['rss-arxiv-qfin', 'quant'],
    ['panewslab', 'web3'],
    ['rss-cls-telegraph', 'macro'],
  ] as const;
  for (const [id] of sources) {
    await sql`
      INSERT INTO sources (id, name, kind, tier, participation_mode, next_fetch_at)
      VALUES (${id}, ${id}, 'rss', 'T2', 'editorial', now())
      ON CONFLICT (id) DO NOTHING`;
    await sql`DELETE FROM theme_sources WHERE source_id = ${id}`;
    await sql`INSERT INTO theme_sources (theme_id, source_id, enabled) VALUES ('finance', ${id}, true)`;
    const articleId = `${id}-${T}`.slice(0, 80);
    await sql`
      INSERT INTO articles (id, source_id, identity_key, url, title, discovered_at, timeline_at)
      VALUES (${articleId}, ${id}, ${`${id}-${T}`}, ${`https://example.com/${id}/${T}`}, ${id}, now(), now())`;
    await sql`INSERT INTO theme_articles (theme_id, article_id, source_id) VALUES ('finance', ${articleId}, ${id})`;
    await sql`
      INSERT INTO analyses (article_id, input_revision, origin, theme_id)
      VALUES (${articleId}, 1, 'model', 'finance')`;
  }

  const [quantStory] = await sql<{ id: number }[]>`
    INSERT INTO stories (public_id, title) VALUES (gen_random_uuid(), ${`quant ${T}`}) RETURNING id`;
  const [mixedStory] = await sql<{ id: number }[]>`
    INSERT INTO stories (public_id, title) VALUES (gen_random_uuid(), ${`mixed ${T}`}) RETURNING id`;
  const [quantFact] = await sql<{ id: number }[]>`
    INSERT INTO facts (public_id, story_id, title) VALUES (${`quant-${T}`}, ${quantStory!.id}, 'quant') RETURNING id`;
  const [mixedFact] = await sql<{ id: number }[]>`
    INSERT INTO facts (public_id, story_id, title) VALUES (${`mixed-${T}`}, ${mixedStory!.id}, 'mixed') RETURNING id`;
  await sql`INSERT INTO fact_articles (fact_id, article_id) VALUES (${quantFact!.id}, ${`rss-arxiv-qfin-${T}`.slice(0, 80)})`;
  await sql`INSERT INTO fact_articles (fact_id, article_id) VALUES
    (${mixedFact!.id}, ${`rss-arxiv-qfin-${T}`.slice(0, 80)}),
    (${mixedFact!.id}, ${`rss-cls-telegraph-${T}`.slice(0, 80)})`;
  await sql`INSERT INTO theme_facts (theme_id, fact_id) VALUES ('finance', ${quantFact!.id}), ('finance', ${mixedFact!.id})`;
  await sql`INSERT INTO theme_stories (theme_id, story_id) VALUES ('finance', ${quantStory!.id}), ('finance', ${mixedStory!.id})`;

  await splitFinanceTheme(sql);

  const themes = await sql<{ id: string }[]>`SELECT id FROM themes WHERE id = 'finance'`;
  assert.equal(themes.length, 0);
  const subs = await sql<{ theme_id: string; source_id: string }[]>`
    SELECT theme_id, source_id FROM theme_sources
    WHERE source_id IN ('rss-arxiv-qfin', 'panewslab', 'rss-cls-telegraph')
    ORDER BY source_id, theme_id`;
  assert.deepEqual(subs.map((row) => ({ theme_id: row.theme_id, source_id: row.source_id })), [
    { theme_id: 'web3', source_id: 'panewslab' },
    { theme_id: 'quant', source_id: 'rss-arxiv-qfin' },
    { theme_id: 'macro', source_id: 'rss-cls-telegraph' },
  ]);
  const articles = await sql<{ theme_id: string; source_id: string }[]>`
    SELECT theme_id, source_id FROM theme_articles WHERE article_id LIKE ${`%-${T}`} ORDER BY source_id`;
  assert.deepEqual(articles.map((row) => ({ theme_id: row.theme_id, source_id: row.source_id })), [
    { theme_id: 'web3', source_id: 'panewslab' },
    { theme_id: 'quant', source_id: 'rss-arxiv-qfin' },
    { theme_id: 'macro', source_id: 'rss-cls-telegraph' },
  ]);
  const facts = await sql<{ theme_id: string; fact_id: number }[]>`
    SELECT theme_id, fact_id FROM theme_facts WHERE fact_id IN (${quantFact!.id}, ${mixedFact!.id}) ORDER BY fact_id`;
  assert.deepEqual(facts.map((row) => ({ theme_id: row.theme_id, fact_id: row.fact_id })), [
    { theme_id: 'quant', fact_id: quantFact!.id },
    { theme_id: 'macro', fact_id: mixedFact!.id },
  ]);
  const stories = await sql<{ theme_id: string; story_id: number }[]>`
    SELECT theme_id, story_id FROM theme_stories WHERE story_id IN (${quantStory!.id}, ${mixedStory!.id}) ORDER BY story_id`;
  assert.deepEqual(stories.map((row) => ({ theme_id: row.theme_id, story_id: row.story_id })), [
    { theme_id: 'quant', story_id: quantStory!.id },
    { theme_id: 'macro', story_id: mixedStory!.id },
  ]);
});
