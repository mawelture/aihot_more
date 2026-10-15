import { config } from "../config.ts";
import { sql, type Db } from "../db.ts";
import { QUEUES, type JobData } from "../jobs/queue.ts";
import { DEFAULT_THEME_ID } from "../../../../themes/index.ts";

export interface ThemeSourceSubscriptionRow {
  theme_id: string;
  source_id: string;
  enabled?: boolean;
}

export interface PlannedThemeArticleRow {
  themeId: string;
  articleId: string;
  sourceId: string;
}

export interface PlannedThemeAnalyzeJob {
  name: typeof QUEUES.analyze;
  data: JobData["content.analyze"];
  singletonKey: string;
}

function normalizeThemeId(themeId?: string | null): string {
  return themeId?.trim() || DEFAULT_THEME_ID;
}

export function usesLegacyThemeQueueShape(themeId?: string | null): boolean {
  return normalizeThemeId(themeId) === DEFAULT_THEME_ID;
}

export function analyzeQueuePayload(articleId: string, themeId?: string | null, attemptTag?: string): JobData["content.analyze"] {
  return usesLegacyThemeQueueShape(themeId)
    ? (attemptTag ? { articleId, attemptTag } : { articleId })
    : (attemptTag ? { articleId, themeId: normalizeThemeId(themeId), attemptTag } : { articleId, themeId: normalizeThemeId(themeId) });
}

export function analyzeQueueSingletonKey(articleId: string, themeId?: string | null): string {
  return usesLegacyThemeQueueShape(themeId) ? articleId : `theme:${normalizeThemeId(themeId)}:${articleId}`;
}

export function groupQueuePayload(articleId: string, themeId?: string | null, signalOnly = false): JobData["events.group"] {
  const base = signalOnly ? { articleId, signalOnly: true as const } : { articleId };
  return usesLegacyThemeQueueShape(themeId) ? base : { ...base, themeId: normalizeThemeId(themeId) };
}

export function signalGroupSingletonKey(articleId: string, themeId?: string | null): string {
  return usesLegacyThemeQueueShape(themeId) ? articleId : `group:signal:${articleId}:${normalizeThemeId(themeId)}`;
}

/** Editorial grouping. The default theme keeps the original key so an in-flight job still blocks a duplicate. */
export function groupSingletonKey(articleId: string, themeId?: string | null): string {
  return usesLegacyThemeQueueShape(themeId) ? articleId : `group:${normalizeThemeId(themeId)}:${articleId}`;
}

export function planThemeArticleRows(articleId: string, sourceId: string, subscriptions: ReadonlyArray<ThemeSourceSubscriptionRow>): PlannedThemeArticleRow[] {
  const rows = new Map<string, PlannedThemeArticleRow>();
  for (const subscription of subscriptions) {
    if (subscription.source_id !== sourceId || subscription.enabled === false) continue;
    if (!rows.has(subscription.theme_id)) rows.set(subscription.theme_id, { themeId: subscription.theme_id, articleId, sourceId });
  }
  return [...rows.values()].sort((a, b) => a.themeId.localeCompare(b.themeId));
}

export function planThemeAnalyzeJobs(articleId: string, themeIds: ReadonlyArray<string>, attemptTag?: string): PlannedThemeAnalyzeJob[] {
  return [...new Set(themeIds)].sort().map((themeId) => ({
    name: QUEUES.analyze,
    data: analyzeQueuePayload(articleId, themeId, attemptTag),
    singletonKey: analyzeQueueSingletonKey(articleId, themeId),
  }));
}

export async function distributeArticleToThemes(articleId: string, sourceId: string, db: Db = sql): Promise<string[]> {
  const subscriptions = await db<ThemeSourceSubscriptionRow[]>`
    SELECT theme_id, source_id, enabled FROM theme_sources WHERE source_id = ${sourceId}`;
  const rows = planThemeArticleRows(articleId, sourceId, subscriptions);
  for (const row of rows) {
    await db`
      INSERT INTO theme_articles (theme_id, article_id, source_id)
      VALUES (${row.themeId}, ${row.articleId}, ${row.sourceId})
      ON CONFLICT (theme_id, article_id) DO NOTHING`;
  }
  return rows.map((row) => row.themeId);
}

/** Parked on an article that no theme has subscribed to, so the sweep does not keep re-queueing it. */
export const UNSUBSCRIBED_PROCESSING_ERROR = "no theme subscription";

/**
 * Themes that already received this article. Empty when the source was not subscribed:
 * the article is not assumed to belong to the default theme.
 */
export async function themeIdsForArticle(articleId: string, db: Db = sql): Promise<string[]> {
  const rows = await db<{ theme_id: string }[]>`
    SELECT theme_id FROM theme_articles WHERE article_id = ${articleId} ORDER BY theme_id`;
  return rows.map((row) => row.theme_id);
}
