// How widely a fact was reported: the editorial sources whose listed reports are evidence of it, by a
// cutoff, as the daily's "另有 N 家信源报道" counts it.
import { sql } from "../db.ts";
import { evidenceCondition, listedCondition, themeIdOf } from "./scope.ts";
import { usesLegacyPublicationTables } from "./storage.ts";

/** The editorial sources that reported each fact by the cutoff. */
export async function factSources(factIds: number[], end: Date, themeId?: string | null): Promise<Map<number, string[]>> {
  if (factIds.length === 0) return new Map();
  const scopedThemeId = themeIdOf(themeId);
  const rows = usesLegacyPublicationTables(scopedThemeId)
    ? await sql<{ fact_id: number; sources: string[] }[]>`
      SELECT fa.fact_id, array_agg(DISTINCT p.source_id) AS sources
      FROM fact_articles fa JOIN publications p ON p.article_id = fa.article_id JOIN sources s ON s.id = p.source_id
      WHERE p.theme_id = ${scopedThemeId} AND fa.fact_id = ANY(${factIds}::bigint[]) AND ${evidenceCondition()} AND ${listedCondition(end)}
        AND s.participation_mode = 'editorial' AND p.timeline_at < ${end}
      GROUP BY fa.fact_id`
    : await sql<{ fact_id: number; sources: string[] }[]>`
      SELECT fa.fact_id, array_agg(DISTINCT p.source_id) AS sources
      FROM fact_articles fa JOIN theme_publications p ON p.article_id = fa.article_id JOIN sources s ON s.id = p.source_id
      WHERE p.theme_id = ${scopedThemeId} AND fa.fact_id = ANY(${factIds}::bigint[]) AND ${evidenceCondition()} AND ${listedCondition(end)}
        AND s.participation_mode = 'editorial' AND p.timeline_at < ${end}
      GROUP BY fa.fact_id`;
  return new Map(rows.map((r) => [r.fact_id, r.sources]));
}
