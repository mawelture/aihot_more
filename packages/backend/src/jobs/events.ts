// Event jobs: serial grouping, debounced digests.
import type { PgBoss } from "pg-boss";
import { groupArticle } from "../events/group.ts";
import { composeStoryDigest } from "../events/digest.ts";
import { settleNonEditorial } from "./content.ts";
import { enqueue, ensureQueue, QUEUES, work } from "./queue.ts";
import { sql } from "../db.ts";
import { DEFAULT_THEME_ID } from "../../../../themes/index.ts";
import { groupQueuePayload, groupSingletonKey } from "../themes/distribution.ts";

export async function registerEventJobs(boss: PgBoss) {
  // Serial on purpose: two reports of the same new fact must not both create it.
  await work(boss, QUEUES.group, { localConcurrency: 1, pollingIntervalSeconds: 0.5 }, async ({ articleId, signalOnly, themeId }) => {
    // A discussion post comes here straight from collection: record it first (settleNonEditorial).
    if (signalOnly && !(await settleNonEditorial(articleId, themeId)).group) return { verdict: "skipped" };
    const result = await groupArticle(articleId, { signalOnly, themeId });
    if (result.storyId && !result.verdict.startsWith("signal")) {
      await enqueue(QUEUES.digest, { storyId: result.storyId, themeId }, { singletonKey: `story:${result.storyId}`, startAfter: 60 });
    }
    return result;
  });
  await work(boss, QUEUES.digest, { localConcurrency: 3, pollingIntervalSeconds: 5 }, ({ storyId, themeId }) => composeStoryDigest(storyId, { themeId }));
}

/** Missing jobs are repaired; terminal failures need a receipt release or an explicit rerun. */
export async function sweepUngrouped(): Promise<{ enqueued: number }> {
  await ensureQueue(QUEUES.group);
  return sql.begin(async (tx) => {
    const rows = await tx<{ id: string; theme_id: string }[]>`
      SELECT a.id, an.theme_id FROM articles a
      JOIN sources s ON s.id = a.source_id
      JOIN analyses an ON an.article_id = a.id AND an.input_revision = a.revision AND an.relevance = 'pass'
      WHERE a.grouping_status = 'pending' AND a.created_at < now() - interval '3 minutes'
        AND s.participation_mode = 'editorial' AND a.processing_state = 'analyzed'
        AND NOT EXISTS (SELECT 1 FROM pgboss.job j WHERE j.name = ${QUEUES.group}
          AND j.data->>'articleId' = a.id
          AND coalesce(j.data->>'themeId', ${DEFAULT_THEME_ID}) = an.theme_id
          AND j.state IN ('created', 'active', 'retry'))
      ORDER BY a.created_at LIMIT 100 FOR UPDATE OF a SKIP LOCKED`;
    let enqueued = 0;
    for (const row of rows) {
      if (await enqueue(QUEUES.group, groupQueuePayload(row.id, row.theme_id), { singletonKey: groupSingletonKey(row.id, row.theme_id) }, tx)) enqueued += 1;
    }
    return { enqueued };
  });
}
