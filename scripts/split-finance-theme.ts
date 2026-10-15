// One-time move of the old finance theme into macro, quant, and web3.
// Release migrations cannot UPDATE rows, so setup runs this after the theme packs exist.
// It does nothing once the finance theme row is gone.
import { sql } from "@aihot/backend/db";

const QUANT_SOURCES = ["rss-arxiv-qfin", "rss-alphaarchitect", "rss-quantpedia", "rss-quantstart", "rss-robotwealth"];
const WEB3_SOURCES = ["panewslab", "rss-theblock", "rss-bitcoinmagazine", "rss-cointelegraph", "rss-decrypt"];

const destination = (source: string) => sql`
  CASE
    WHEN ${sql.unsafe(source)} IN ${sql(QUANT_SOURCES)} THEN 'quant'
    WHEN ${sql.unsafe(source)} IN ${sql(WEB3_SOURCES)} THEN 'web3'
    ELSE 'macro'
  END`;

export async function splitFinanceTheme(db: typeof sql = sql): Promise<void> {
  const [finance] = await db<{ id: string }[]>`SELECT id FROM themes WHERE id = 'finance'`;
  if (!finance) return;
  const ready = await db<{ id: string }[]>`SELECT id FROM themes WHERE id IN ('macro', 'quant', 'web3')`;
  if (ready.length !== 3) throw new Error("macro, quant, and web3 must exist before finance rows move");

  await db.begin(async (tx) => {
    const [locked] = await tx<{ id: string }[]>`SELECT id FROM themes WHERE id = 'finance' FOR UPDATE`;
    if (!locked) return;
    const articleTarget = destination("row.source_id");
    for (const table of ["theme_sources"] as const) {
      await tx`
        UPDATE theme_sources AS row
        SET theme_id = ${articleTarget}
        WHERE row.theme_id = 'finance'
          AND NOT EXISTS (
            SELECT 1 FROM theme_sources AS existing
            WHERE existing.theme_id = ${articleTarget}
              AND existing.source_id = row.source_id
          )`;
      await tx`DELETE FROM theme_sources WHERE theme_id = 'finance'`;
    }

    for (const table of ["theme_articles", "theme_publications"] as const) {
      await tx`
        UPDATE ${tx(table)} AS row
        SET theme_id = ${articleTarget}
        WHERE row.theme_id = 'finance'
          AND NOT EXISTS (
            SELECT 1 FROM ${tx(table)} AS existing
            WHERE existing.theme_id = ${articleTarget}
              AND existing.article_id = row.article_id
          )`;
      await tx`DELETE FROM ${tx(table)} WHERE theme_id = 'finance'`;
    }

    const joinedTarget = destination("a.source_id");
    for (const table of ["theme_selected_state", "theme_pool_search", "theme_grouping_overrides", "theme_editorial_overrides"] as const) {
      await tx`
        UPDATE ${tx(table)} AS row
        SET theme_id = ${joinedTarget}
        FROM articles AS a
        WHERE row.theme_id = 'finance'
          AND a.id = row.article_id
          AND NOT EXISTS (
            SELECT 1 FROM ${tx(table)} AS existing
            WHERE existing.theme_id = ${joinedTarget}
              AND existing.article_id = row.article_id
          )`;
      await tx`DELETE FROM ${tx(table)} WHERE theme_id = 'finance'`;
    }

    await tx`
      UPDATE theme_grouping_decisions AS row
      SET theme_id = ${joinedTarget}
      FROM articles AS a
      WHERE row.theme_id = 'finance' AND a.id = row.article_id`;
    await tx`DELETE FROM theme_grouping_decisions WHERE theme_id = 'finance'`;

    await tx`
      UPDATE analyses AS row
      SET theme_id = ${joinedTarget}
      FROM articles AS a
      WHERE row.theme_id = 'finance' AND a.id = row.article_id`;
    await tx`UPDATE analyses SET theme_id = 'macro' WHERE theme_id = 'finance'`;

    await tx`
      UPDATE publications AS row
      SET theme_id = ${articleTarget}
      WHERE row.theme_id = 'finance'`;
    await tx`
      UPDATE editorial_overrides AS row
      SET theme_id = ${joinedTarget}
      FROM articles AS a
      WHERE row.theme_id = 'finance' AND a.id = row.article_id`;
    await tx`UPDATE editorial_overrides SET theme_id = 'macro' WHERE theme_id = 'finance'`;
    await tx`
      UPDATE pool_search AS row
      SET theme_id = ${joinedTarget}
      FROM articles AS a
      WHERE row.theme_id = 'finance' AND a.id = row.article_id`;
    await tx`UPDATE pool_search SET theme_id = 'macro' WHERE theme_id = 'finance'`;
    await tx`
      UPDATE selected_ledger AS row
      SET theme_id = ${joinedTarget}
      FROM articles AS a
      WHERE row.theme_id = 'finance' AND a.id = row.article_id`;
    await tx`UPDATE selected_ledger SET theme_id = 'macro' WHERE theme_id = 'finance'`;

    const factTarget = sql`
      COALESCE((
        SELECT CASE
          WHEN bool_and(a.source_id IN ${sql(QUANT_SOURCES)}) THEN 'quant'
          WHEN bool_and(a.source_id IN ${sql(WEB3_SOURCES)}) THEN 'web3'
          ELSE 'macro'
        END
        FROM fact_articles fa
        JOIN articles a ON a.id = fa.article_id
        WHERE fa.fact_id = row.fact_id
      ), 'macro')`;
    await tx`
      UPDATE theme_facts AS row
      SET theme_id = ${factTarget}
      WHERE row.theme_id = 'finance'
        AND NOT EXISTS (
          SELECT 1 FROM theme_facts AS existing
          WHERE existing.fact_id = row.fact_id
            AND existing.theme_id = ${factTarget}
        )`;
    await tx`DELETE FROM theme_facts WHERE theme_id = 'finance'`;

    const storyTarget = sql`
      COALESCE((
        SELECT CASE
          WHEN bool_and(a.source_id IN ${sql(QUANT_SOURCES)}) THEN 'quant'
          WHEN bool_and(a.source_id IN ${sql(WEB3_SOURCES)}) THEN 'web3'
          ELSE 'macro'
        END
        FROM facts f
        JOIN fact_articles fa ON fa.fact_id = f.id
        JOIN articles a ON a.id = fa.article_id
        WHERE f.story_id = row.story_id
      ), 'macro')`;
    await tx`
      UPDATE theme_stories AS row
      SET theme_id = ${storyTarget}
      WHERE row.theme_id = 'finance'
        AND NOT EXISTS (
          SELECT 1 FROM theme_stories AS existing
          WHERE existing.story_id = row.story_id
            AND existing.theme_id = ${storyTarget}
        )`;
    await tx`DELETE FROM theme_stories WHERE theme_id = 'finance'`;

    await tx`
      UPDATE theme_reports AS row
      SET theme_id = 'macro'
      WHERE row.theme_id = 'finance'
        AND NOT EXISTS (
          SELECT 1 FROM theme_reports AS existing
          WHERE existing.theme_id = 'macro' AND existing.kind = row.kind AND existing.key = row.key
        )`;
    await tx`DELETE FROM theme_reports WHERE theme_id = 'finance'`;
    await tx`UPDATE reports SET theme_id = 'macro' WHERE theme_id = 'finance'`;
    await tx`UPDATE hot_rankings SET theme_id = 'macro' WHERE theme_id = 'finance'`;

    await tx`DELETE FROM themes WHERE id = 'finance'`;
  });
  console.log("split finance theme into macro, quant, and web3");
}

if (import.meta.main) {
  const { closeDb } = await import("@aihot/backend/db");
  try {
    await splitFinanceTheme();
  } finally {
    await closeDb();
  }
}
