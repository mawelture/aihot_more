// Figures for the about page: how much the site covers, counted from the public read layer and kept for
// ten minutes per process (the page itself is cached for five); an older copy is served while the
// counts are read again, so no reader waits for the full-table counts.
import type { SiteStats } from "@aihot/contracts/site";
import { sql } from "../db.ts";
import { cachedByKey } from "../lib/cache.ts";
import { publicSourceName } from "../publication/rules.ts";
import { selectedCondition, themeIdOf } from "../publication/scope.ts";
import { publicationStorageForTheme } from "../publication/storage.ts";
import { reportStorageForTheme } from "../reports/storage.ts";

export type { SiteStats };

/** How many sources the about page's river draws, at most. */
const SAMPLE = 180;

const stats = cachedByKey(
  (themeId?: string | null) => themeIdOf(themeId),
  (themeId?: string | null) => querySiteStats(new Date(), themeId),
  { freshMs: 10 * 60_000, maxStaleMs: 60 * 60_000, maxKeys: 16 },
);

export function siteStatsReadScope(themeId?: string | null) {
  const scopedThemeId = themeIdOf(themeId);
  return {
    themeId: scopedThemeId,
    publicationsTable: publicationStorageForTheme(scopedThemeId).publicationsTable,
    reportsTable: reportStorageForTheme(scopedThemeId).reportsTable,
  };
}

export function loadSiteStats(themeId?: string | null): Promise<SiteStats> {
  return stats(themeId);
}

async function querySiteStats(now: Date, themeId?: string | null): Promise<SiteStats> {
  const dayAgo = new Date(now.getTime() - 24 * 3600_000);
  const scopedThemeId = themeIdOf(themeId);
  const publicationTable = publicationStorageForTheme(scopedThemeId).publicationsTable;
  const reportsTable = reportStorageForTheme(scopedThemeId).reportsTable;
  const subscribedSources = sql`
    FROM theme_sources ts
    JOIN sources s ON s.id = ts.source_id
    WHERE ts.theme_id = ${scopedThemeId} AND ts.enabled AND s.enabled`;
  const [[row], kinds, sample, latest] = await Promise.all([
    sql<Array<Omit<SiteStats, "sourceKinds" | "day" | "sampleSources" | "latest"> & { collected: number; selectedDay: number }>>`
      SELECT (SELECT count(*) ${subscribedSources})::int AS sources,
             (SELECT count(*) FROM ${sql.unsafe(publicationTable)} p WHERE p.theme_id = ${scopedThemeId} AND p.visibility <> 'withdrawn')::int AS items,
             (SELECT count(*) FROM ${sql.unsafe(publicationTable)} p WHERE p.theme_id = ${scopedThemeId} AND ${selectedCondition(now)})::int AS selected,
             (SELECT count(*) FROM ${sql.unsafe(reportsTable)} WHERE theme_id = ${scopedThemeId} AND kind = 'daily')::int AS dailies,
             (SELECT count(*) FROM ${sql.unsafe(publicationTable)} p WHERE p.theme_id = ${scopedThemeId} AND p.visibility <> 'withdrawn' AND p.discovered_at > ${dayAgo})::int AS collected,
             (SELECT count(*) FROM ${sql.unsafe(publicationTable)} p WHERE p.theme_id = ${scopedThemeId} AND ${selectedCondition(now)} AND p.timeline_at > ${dayAgo})::int AS "selectedDay"`,
    sql<{ kind: string; n: number }[]>`
      SELECT s.kind, count(*)::int AS n
      ${subscribedSources}
      GROUP BY s.kind
      ORDER BY s.kind`,
    // A shuffle that holds for the day, so the river keeps its sources between visits.
    sql<{ name: string; kind: string; heat_only: boolean }[]>`
      SELECT s.name, s.kind, s.participation_mode = 'hot_signal' AS heat_only
      ${subscribedSources}
      ORDER BY md5(s.id::text || ${now.toISOString().slice(0, 10)}), s.id
      LIMIT ${SAMPLE}`,
    sql<{ id: string; title: string; source: string }[]>`
      SELECT p.article_id AS id, p.title, s.name AS source FROM ${sql.unsafe(publicationTable)} p JOIN sources s ON s.id = p.source_id
      WHERE p.theme_id = ${scopedThemeId} AND ${selectedCondition(now)} ORDER BY p.timeline_at DESC, p.article_id DESC LIMIT 8`,
  ]);
  const { collected, selectedDay, ...totals } = row!;
  const value: SiteStats = {
    ...totals,
    sourceKinds: Object.fromEntries(kinds.map((k) => [k.kind, k.n])),
    day: { collected, selected: selectedDay },
    sampleSources: sample.map((s) => ({ name: publicSourceName(s.name), kind: s.kind, heatOnly: s.heat_only })),
    latest: latest.map((item) => ({ ...item, source: publicSourceName(item.source) })),
  };
  return value;
}
