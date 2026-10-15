// Manual grouping corrections, made from the admin or by an operations script: take a
// report out of its fact, put it into the fact an editor names, merge two stories, or ask for a regroup. Each change is
// written under the article's row lock, which automatic grouping takes too before it writes, and is
// never undone by automatic grouping, retries or later revisions (only an explicit regroup).
import { audit, Conflict } from "../audit.ts";
import { sql, type Db, type Tx } from "../db.ts";
import { enqueue, QUEUES } from "../jobs/queue.ts";
import { groupingReset } from "../content/provenance.ts";
import { publishArticle, publishArticleTx } from "../publication/publish.ts";
import { themeIdOf } from "../publication/scope.ts";
import { publicationStorageForTheme, usesLegacyPublicationTables } from "../publication/storage.ts";
import { groupQueuePayload } from "../themes/distribution.ts";
import { factInThemeCondition, storyInThemeCondition } from "./scope.ts";
import { groupingStorageForTheme, usesLegacyGroupingTables } from "./storage.ts";
import { recordSignal, resetAutomatic } from "./group.ts";
import { composeStoryDigest } from "./digest.ts";
import { mergeStoryInto } from "./merge.ts";
import { emit } from "../modules.ts";

export function manualCorrectionScope(themeId?: string | null) {
  const scopedThemeId = themeIdOf(themeId);
  const publication = publicationStorageForTheme(scopedThemeId);
  const grouping = groupingStorageForTheme(scopedThemeId);
  return {
    themeId: scopedThemeId,
    publicationsTable: publication.publicationsTable,
    overridesTable: grouping.overridesTable,
    decisionsTable: grouping.decisionsTable,
  };
}

/**
 * Takes an article out of its fact; it is shown on its own again and stays that way (automatic
 * grouping, retries and later revisions do not re-attach it; an explicit regroup does). Its heat
 * evidence leaves the old story, whose digest is rewritten.
 */
export async function detachFromFact(id: string, reason: string, actor: string, themeId?: string) {
  const scopedThemeId = themeIdOf(themeId);
  const { facts, stories } = await sql.begin(async (tx) => {
    // The grouping job writes under the same lock and reads this decision again before it does.
    await tx`SELECT 1 FROM articles WHERE id = ${id} FOR UPDATE`;
    const removed = await tx<{ fact_id: number }[]>`DELETE FROM fact_articles WHERE article_id = ${id} RETURNING fact_id`;
    const factIds = removed.map((r) => r.fact_id);
    const storyRows = factIds.length ? await tx<{ story_id: number }[]>`SELECT DISTINCT story_id FROM facts WHERE id = ANY(${factIds}) AND story_id IS NOT NULL AND ${storyInThemeCondition(scopedThemeId, sql`story_id`)}` : [];
    const signals = await tx<{ story_id: number }[]>`DELETE FROM story_signals WHERE article_id = ${id} RETURNING story_id`;
    const storyIds = [...new Set([...storyRows, ...signals].map((r) => r.story_id))];
    if (usesLegacyGroupingTables(scopedThemeId)) {
      await tx`INSERT INTO grouping_overrides (article_id, reason, actor) VALUES (${id}, ${reason}, ${actor})
               ON CONFLICT (article_id) DO UPDATE SET reason = EXCLUDED.reason, actor = EXCLUDED.actor, created_at = now()`;
    } else {
      await tx`INSERT INTO theme_grouping_overrides (theme_id, article_id, reason, actor) VALUES (${scopedThemeId}, ${id}, ${reason}, ${actor})
               ON CONFLICT (theme_id, article_id) DO UPDATE SET reason = EXCLUDED.reason, actor = EXCLUDED.actor, created_at = now()`;
    }
    await tx`UPDATE articles SET grouped_at = now(), grouping_status = 'complete', grouping_receipt_id = NULL, grouping_error = NULL, selection_adds_value = true, selection_value_reason = NULL WHERE id = ${id}`;
    return { facts: factIds, stories: storyIds };
  });
  await publishArticle(id, { themeId: scopedThemeId });
  // The fact's other reports may take a new reading-group anchor.
  if (facts.length) {
    const others = await sql<{ article_id: string }[]>`SELECT DISTINCT article_id FROM fact_articles WHERE fact_id = ANY(${facts})`;
    for (const o of others) await publishArticle(o.article_id, { themeId: scopedThemeId });
  }
  for (const storyId of stories) await enqueue(QUEUES.digest, { storyId, themeId: scopedThemeId }, { singletonKey: `story:${storyId}` });
  await audit(actor, "content.detach", `content:${id}`, reason, { facts, stories }, null);
  return { detached: facts.length };
}

/**
 * Puts an article into the fact an editor names, as one of its reports, and keeps it there: the
 * membership is manual, so automatic grouping, retries and later revisions leave it alone. The
 * article leaves the facts it was a report of (mentions stay); its heat evidence follows it to the
 * fact's story, and a story left without any report redirects there.
 */
export async function moveToFact(id: string, factPublicId: string, reason: string, actor: string, themeId?: string) {
  const scopedThemeId = themeIdOf(themeId);
  const moved = await sql.begin(async (tx) => {
    // The grouping job writes under the same lock and reads this decision again before it does.
    const [article] = await tx<{ source_id: string; at: Date }[]>`SELECT source_id, coalesce(published_at, discovered_at) AS at FROM articles WHERE id = ${id} FOR UPDATE`;
    if (!article) return null;
    const [target] = await tx<{ id: number; story_id: number }[]>`
      SELECT f.id, f.story_id FROM facts f JOIN stories st ON st.id = f.story_id
      WHERE f.public_id = ${factPublicId} AND st.merged_into IS NULL
        AND ${factInThemeCondition(scopedThemeId, sql`f.id`)} AND ${storyInThemeCondition(scopedThemeId, sql`st.id`)}`;
    if (!target) throw new Conflict("目标事实不存在，或它所在的事件已被合并");
    const removed = await tx<{ fact_id: number; evidence: string | null }[]>`
      DELETE FROM fact_articles WHERE article_id = ${id} AND (role IN ('primary', 'report') OR fact_id = ${target.id}) RETURNING fact_id, evidence`;
    const facts = removed.map((r) => Number(r.fact_id)).filter((factId) => factId !== Number(target.id));
    const stories = facts.length
      ? (await tx<{ story_id: number }[]>`SELECT DISTINCT story_id FROM facts WHERE id = ANY(${facts}) AND story_id IS NOT NULL AND story_id <> ${target.story_id} AND ${storyInThemeCondition(scopedThemeId, sql`story_id`)}`).map((r) => Number(r.story_id))
      : [];
    if (usesLegacyGroupingTables(scopedThemeId)) await tx`DELETE FROM grouping_overrides WHERE article_id = ${id}`;
    else await tx`DELETE FROM theme_grouping_overrides WHERE theme_id = ${scopedThemeId} AND article_id = ${id}`;
    await tx`INSERT INTO fact_articles (fact_id, article_id, role, evidence, manual, created_at)
             VALUES (${target.id}, ${id}, 'report', ${removed.find((r) => r.evidence)?.evidence ?? null}, true, ${article.at})`;
    await tx`DELETE FROM story_signals WHERE article_id = ${id} AND story_id <> ${target.story_id}`;
    const [source] = await tx<{ id: string; signal_group_id: string | null }[]>`SELECT id, signal_group_id FROM sources WHERE id = ${article.source_id}`;
    await recordSignal(tx, target.story_id, id, source!, "editorial", article.at);
    await tx`UPDATE articles SET grouped_at = now(), grouping_status = 'complete', grouping_receipt_id = NULL, grouping_error = NULL, selection_adds_value = true, selection_value_reason = NULL WHERE id = ${id}`;
    return { fact: Number(target.id), story: Number(target.story_id), facts, stories };
  });
  if (!moved) return null;
  await publishArticle(id, { themeId: scopedThemeId });
  // The old facts' other reports may take a new reading-group anchor.
  if (moved.facts.length) {
    const others = await sql<{ article_id: string }[]>`SELECT DISTINCT article_id FROM fact_articles WHERE fact_id = ANY(${moved.facts})`;
    for (const o of others) await publishArticle(o.article_id, { themeId: scopedThemeId });
  }
  for (const storyId of moved.stories) {
    const [left] = await sql`SELECT 1 FROM facts f JOIN fact_articles fa ON fa.fact_id = f.id WHERE f.story_id = ${storyId} AND fa.role IN ('primary', 'report') LIMIT 1`;
    if (!left && (await mergeStoryInto(storyId, moved.story, `报道已全部移走，旧地址跳到报道所在事件（最后一篇 ${id}）`, actor, scopedThemeId))) continue;
    await enqueue(QUEUES.digest, { storyId, themeId: scopedThemeId }, { singletonKey: `story:${storyId}` });
  }
  await enqueue(QUEUES.digest, { storyId: moved.story, themeId: scopedThemeId }, { singletonKey: `story:${moved.story}` });
  await audit(actor, "content.move", `content:${id}`, reason, { facts: moved.facts, stories: moved.stories }, { fact: moved.fact, story: moved.story });
  return { fact: moved.fact, story: moved.story, left: moved.facts.length };
}

/** Merges one story into another: facts move, the old public id keeps working as an alias. */
export async function mergeStories(fromId: number, intoId: number, reason: string, actor: string, themeId?: string) {
  if (fromId === intoId) throw new Error("cannot merge a story into itself");
  const done = await mergeStoryInto(fromId, intoId, reason, actor, themeIdOf(themeId));
  if (done) return done;
  const found = await sql<{ id: number }[]>`SELECT id FROM stories WHERE id IN (${fromId}, ${intoId})`;
  if (found.length < 2) throw new Error("story not found");
  throw new Conflict("两个事件都必须是未合并的事件");
}

/**
 * Writes one story's digest again from its current reports with the current prompt (after the digest
 * prompt changed). Unchanged prompt and reports reuse the paid answer; the model call happens here.
 */
export async function rewriteStoryDigest(storyId: number, reason: string, actor: string) {
  const [before] = await sql<{ digest: string | null; version: number }[]>`SELECT digest, version FROM stories WHERE id = ${storyId} AND merged_into IS NULL`;
  if (!before) throw new Error("story not found");
  const result = await composeStoryDigest(storyId, { rewrite: true });
  await audit(actor, "story.rewrite-digest", `story:${storyId}`, reason, before, result);
  return result;
}

/**
 * An explicit regroup: it replaces an earlier "keep standalone" decision and drops the automatic
 * membership and heat evidence now (manual memberships stay and still win), so until its grouping job
 * decides again the report stands on its own and is evidence for no other. The same request id
 * queues one job.
 */
export async function requestRegroup(articleId: string, requestId: string, db: Db = sql, themeId?: string): Promise<string | null> {
  const scopedThemeId = themeIdOf(themeId);
  if ("begin" in db) return (db as typeof sql).begin(tx => requestRegroup(articleId, requestId, tx, scopedThemeId));
  // The grouping job writes under the same lock and reads the manual state again before it does.
  await db`SELECT 1 FROM articles WHERE id = ${articleId} FOR UPDATE`;
  const previous = usesLegacyPublicationTables(scopedThemeId)
    ? await db<{ story_id: number }[]>`
      SELECT story_id FROM publications WHERE theme_id = ${scopedThemeId} AND article_id = ${articleId} AND story_id IS NOT NULL
      UNION
      SELECT f.story_id FROM facts f JOIN fact_articles fa ON fa.fact_id = f.id
      WHERE fa.article_id = ${articleId} AND f.story_id IS NOT NULL`
    : await db<{ story_id: number }[]>`
      SELECT story_id FROM theme_publications WHERE theme_id = ${scopedThemeId} AND article_id = ${articleId} AND story_id IS NOT NULL
      UNION
      SELECT f.story_id FROM facts f JOIN fact_articles fa ON fa.fact_id = f.id
      WHERE fa.article_id = ${articleId} AND f.story_id IS NOT NULL`;
  if (usesLegacyGroupingTables(scopedThemeId)) await db`DELETE FROM grouping_overrides WHERE article_id = ${articleId}`;
  else await db`DELETE FROM theme_grouping_overrides WHERE theme_id = ${scopedThemeId} AND article_id = ${articleId}`;
  await resetAutomatic(db as Tx, articleId, scopedThemeId);
  await db`UPDATE articles SET ${groupingReset()} WHERE id = ${articleId}`;
  const published = await publishArticleTx(db as Tx, articleId, { themeId: scopedThemeId });
  if (published?.changed || previous.length) await emit("articleChanged", {
    id: articleId, kind: "content", reduced: published?.reduced, reason: "regroup requested", previousStoryIds: previous.map((r) => r.story_id),
  }, db);
  return enqueue(QUEUES.group, groupQueuePayload(articleId, scopedThemeId), { singletonKey: `manual:group:${articleId}:${requestId}` }, db);
}
