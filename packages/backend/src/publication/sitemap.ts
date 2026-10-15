// Sitemap from the same public metadata as pages. Process and HTTP caches share one five-minute
// deadline; a saved copy may bridge a restart only for the remainder of that original lifetime.
import { mkdir, readFile, stat, utimes, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "../config.ts";
import { sql } from "../db.ts";
import { cachedByKey, SHARED_ONLY } from "../lib/cache.ts";
import { escapeXml } from "../lib/text.ts";
import { siteUrl } from "./links.ts";
import { evidenceCondition, listedCondition, selectedCondition, storyReportCondition, themeIdOf } from "./scope.ts";
import { topicPageCounts } from "./topics.ts";
import { serverModules, type SitemapEntry } from "../modules.ts";
import { publicationStorageForTheme } from "./storage.ts";
import { reportStorageForTheme } from "../reports/storage.ts";

const MAX_URLS = 45_000;
const TTL_MS = 5 * 60 * 1000;
const CACHE_FILE = path.join(config.dataDir, "sitemap-last.xml");

interface SitemapDocument { xml: string; expiresAt: number }

const lastGoodByTheme = new Map<string, SitemapDocument>();

type Entry = SitemapEntry;

export function sitemapReadScope(themeId?: string | null) {
  const scopedThemeId = themeIdOf(themeId);
  return {
    themeId: scopedThemeId,
    publicationsTable: publicationStorageForTheme(scopedThemeId).publicationsTable,
    reportsTable: reportStorageForTheme(scopedThemeId).reportsTable,
  };
}

const cacheFileFor = (themeId?: string | null) => path.join(config.dataDir, `sitemap-last-${themeIdOf(themeId)}.xml`);

async function build(at: Date, themeId?: string | null): Promise<string> {
  const scope = sitemapReadScope(themeId);
  const entries: Entry[] = [];
  const [latestItem] = await sql<{ t: Date | null }[]>`SELECT max(p.timeline_at) AS t FROM ${sql.unsafe(scope.publicationsTable)} p WHERE p.theme_id = ${scope.themeId} AND ${selectedCondition(at)}`;
  const [latestDaily] = await sql<{ key: string | null; t: Date | null }[]>`SELECT max(key) AS key, max(generated_at) AS t FROM ${sql.unsafe(scope.reportsTable)} WHERE theme_id = ${scope.themeId} AND kind = 'daily'`;
  const now = latestItem?.t ?? new Date();
  entries.push(
    { loc: "/", lastmod: now, changefreq: "hourly", priority: 1 },
    { loc: "/all", lastmod: now, changefreq: "hourly", priority: 0.9 },
    { loc: "/daily", lastmod: latestDaily?.t, changefreq: "daily", priority: 0.9 },
    { loc: "/hot", lastmod: now, changefreq: "hourly", priority: 0.9 },
    { loc: "/daily/archive", lastmod: latestDaily?.t, changefreq: "daily", priority: 0.7 },
    { loc: "/weekly", changefreq: "weekly", priority: 0.7 },
    { loc: "/monthly", changefreq: "monthly", priority: 0.6 },
    { loc: "/topics", changefreq: "daily", priority: 0.7 },
    // The modules' pages, between the content pages and the site's own.
    ...serverModules().flatMap((m) => m.sitemap?.pages ?? []),
    { loc: "/agent", lastmod: now, changefreq: "weekly", priority: 0.7 },
    { loc: "/about", changefreq: "monthly", priority: 0.5 },
    { loc: "/terms", changefreq: "monthly", priority: 0.4 },
    { loc: "/privacy", changefreq: "monthly", priority: 0.4 },
    { loc: "/changelog", lastmod: now, changefreq: "weekly", priority: 0.5 },
  );
  const reports = await sql<{ kind: string; key: string; generated_at: Date }[]>`SELECT kind, key, generated_at FROM ${sql.unsafe(scope.reportsTable)} WHERE theme_id = ${scope.themeId} ORDER BY kind, key DESC`;
  for (const r of reports) entries.push({ loc: `/${r.kind}/${r.key}`, lastmod: r.generated_at, changefreq: r.kind === "daily" ? "never" : "monthly", priority: r.kind === "daily" ? 0.6 : 0.6 });
  for (const t of await topicPageCounts(at, scope.themeId)) {
    if (!t.indexable) continue;
    entries.push({ loc: `/topics/${t.slug}`, lastmod: t.changedAt, changefreq: "daily", priority: 0.6 });
    for (let p = 2; p <= t.pages; p++) entries.push({ loc: `/topics/${t.slug}/page/${p}`, lastmod: t.changedAt, changefreq: "weekly", priority: 0.3 });
  }
  // Stories with listed evidence of their own; pages that only gather reports grouped elsewhere (imported
  // story levels, regrouped history) or only mention facts are reachable but not listed.
  const stories = await sql<{ public_id: string; latest_at: Date | null }[]>`
    SELECT public_id::text, latest_at FROM stories WHERE merged_into IS NULL AND EXISTS (
      SELECT 1 FROM facts f JOIN fact_articles fa ON fa.fact_id = f.id JOIN ${sql.unsafe(scope.publicationsTable)} p ON p.article_id = fa.article_id
      WHERE p.theme_id = ${scope.themeId} AND f.story_id = stories.id AND ${evidenceCondition()} AND ${listedCondition(at)})
    ORDER BY latest_at DESC NULLS LAST, id DESC LIMIT 500`;
  for (const s of stories) entries.push({ loc: `/story/${s.public_id}`, lastmod: s.latest_at, changefreq: "daily", priority: 0.5 });
  for (const m of serverModules()) if (m.sitemap?.entries) entries.push(...(await m.sitemap.entries()));
  const items = await sql<{ id: string; t: Date }[]>`
    SELECT p.article_id AS id, p.updated_at AS t FROM ${sql.unsafe(scope.publicationsTable)} p JOIN sources s ON s.id = p.source_id
    WHERE p.theme_id = ${scope.themeId} AND ${storyReportCondition(at)} AND p.indexable
    ORDER BY p.timeline_at DESC, p.article_id DESC LIMIT ${MAX_URLS - entries.length}`;
  for (const it of items) entries.push({ loc: `/items/${it.id}`, lastmod: it.t, changefreq: "monthly", priority: 0.5 });

  const body = entries
    .slice(0, MAX_URLS)
    .map((e) => {
      const parts = [`<loc>${escapeXml(siteUrl(e.loc))}</loc>`];
      if (e.lastmod) parts.push(`<lastmod>${e.lastmod.toISOString()}</lastmod>`);
      if (e.changefreq) parts.push(`<changefreq>${e.changefreq}</changefreq>`);
      if (e.priority !== undefined) parts.push(`<priority>${e.priority}</priority>`);
      return `<url>\n${parts.join("\n")}\n</url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

const rebuilding = cachedByKey((themeId?: string | null) => themeIdOf(themeId), (themeId?: string | null) => refreshSitemap(themeId), { ...SHARED_ONLY, maxKeys: 16 });

export function loadSitemap(themeId?: string | null): Promise<SitemapDocument> {
  const key = themeIdOf(themeId);
  const lastGood = lastGoodByTheme.get(key);
  if (lastGood && lastGood.expiresAt > Date.now()) return Promise.resolve(lastGood);
  return rebuilding(themeId);
}

async function refreshSitemap(themeId?: string | null): Promise<SitemapDocument> {
  const key = themeIdOf(themeId);
  const cacheFile = cacheFileFor(themeId);
  try {
    const at = Date.now();
    const xml = await build(new Date(at), themeId);
    const current = { xml, expiresAt: at + TTL_MS };
    lastGoodByTheme.set(key, current);
    await mkdir(path.dirname(cacheFile), { recursive: true });
    // The file's timestamp preserves the same deadline when another process loads it after restart.
    await writeFile(cacheFile, xml).then(() => utimes(cacheFile, new Date(at), new Date(at))).catch(() => {});
    return current;
  } catch (error) {
    const lastGood = lastGoodByTheme.get(key);
    if (lastGood && lastGood.expiresAt > Date.now()) return lastGood;
    const saved = await Promise.all([readFile(cacheFile, "utf8"), stat(cacheFile)]).catch(() => null);
    if (saved && saved[1].mtimeMs + TTL_MS > Date.now()) {
      const current = { xml: saved[0], expiresAt: saved[1].mtimeMs + TTL_MS };
      lastGoodByTheme.set(key, current);
      return current;
    }
    throw error;
  }
}
