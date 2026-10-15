# Multi-theme Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add path-based multi-theme support so one deployment can host multiple independent theme views with shared collection, theme-specific editorial logic, and no global public aggregate view.

**Architecture:** Keep collection and raw article storage global, add theme and theme-source subscription tables, distribute each collected article into one or more themes, and make analysis, publication, grouping, reports, and public read paths theme-scoped. Theme configuration moves from the old single-pack layout to per-theme code packs loaded at runtime.

**Tech Stack:** Node.js 24, TypeScript, Fastify, React Router SSR, PostgreSQL, pg-boss, npm workspaces.

**Spec:** `/Volumes/app/development/repo/AIHOT/docs/superpowers/specs/2026-10-10-multi-theme-site-design.md`

## Global Constraints

- Public site has no aggregate all-theme view; every public page belongs to one theme.
- `/` redirects to the configured default theme.
- Sources remain global objects; themes only subscribe or unsubscribe from sources.
- Theme subscriptions must not override source collection properties or scheduling.
- Collection, extraction, and raw article storage stay global and run once per source/article.
- The same article may be distributed into multiple themes.
- Unsubscribing a theme from a source only affects future distribution; historical theme content remains.
- Theme configuration remains code-file driven in phase 1; admin only manages default theme and theme↔source subscriptions.
- All public exits must continue to read through `packages/backend/src/publication/` with explicit theme scoping.
- Frontend must continue reading backend over HTTP only.
- Readers opening pages must not trigger model calls.
- Paid requests must continue using receipts and budgets; no direct bypasses.

## Review Focus

- A single source subscribed by multiple themes is collected once but distributed to every subscribed theme.
- Unsubscribing a theme from a source stops future distribution without deleting historical theme publications or reports.
- A single article can produce different theme outcomes (selected in one theme, rejected in another) without unique-key collisions.
- Public paths, ETags, and caches do not leak content across themes.
- With only the seeded first theme enabled, behavior remains equivalent to today's single-theme site.

---

### Task 1: Introduce theme registry, theme packs, and theme subscription schema

**Files:**
- Create: `themes/index.ts`
- Create: `themes/ai/taxonomy.ts`
- Create: `themes/ai/topics.json`
- Create: `themes/ai/selection.ts`
- Create: `themes/ai/prompts/` (copy current prompt set)
- Modify: legacy single-pack workspace metadata as needed
- Modify: `packages/backend/src/config.ts`
- Modify: `site/package.json`
- Create: `database/migrations/0058_create_themes.sql`
- Create: `database/migrations/0059_create_theme_sources.sql`
- Create: `database/migrations/0060_seed_ai_theme.sql`
- Create: `database/migrations/0061_seed_ai_theme_sources.sql`
- Test: `tests/theme-registry.test.ts`
- Test: `tests/theme-subscriptions.test.ts`

**Interfaces:**
- Consumes: current single-theme pack contents and current settings table behavior.
- Produces:
  - `ThemeId` runtime identity (`ai`, `finance`, etc.)
  - `loadThemePack(themeId: string)` loader returning `taxonomy`, `topics`, `selection`, and prompt root
  - DB tables `themes` and `theme_sources`

- [ ] **Step 1: Write failing tests for theme pack loading and theme subscription defaults**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';

test('loadThemePack returns the seeded ai theme pack', async () => {
  const { loadThemePack } = await import('../themes/index.ts');
  const pack = loadThemePack('ai');
  assert.equal(pack.id, 'ai');
  assert.ok(pack.taxonomy.CATEGORIES.length > 0);
});

test('seeded default theme is ai and every existing source subscribes to it', async () => {
  const rows = await listThemeSourceSubscriptions();
  assert.ok(rows.some((r) => r.theme_id === 'ai'));
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/theme-registry.test.ts tests/theme-subscriptions.test.ts`
Expected: FAIL because theme loader and tables do not exist.

- [ ] **Step 3: Add the runtime theme registry and seed the first theme schema**

Implement `themes/index.ts` and the seeded `themes/ai/*` pack by moving the current single-theme configuration into the `ai` theme pack while preserving the current values exactly.

- [ ] **Step 4: Add migration for `themes` and `theme_sources` and seed `ai` as the default theme**

Add one online-safe migration file that creates `themes` and `theme_sources`, inserts the seeded `ai` theme, and subscribes it to the currently enabled source set using an idempotent statement strategy compatible with the repository migration rules.

- [ ] **Step 5: Run tests to verify they pass**

Run: `DATABASE_URL=postgres://127.0.0.1:5432/myhot_test node --test tests/theme-registry.test.ts tests/theme-subscriptions.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add themes/index.ts themes/ai packages/backend/src/config.ts site/package.json database/migrations tests/theme-registry.test.ts tests/theme-subscriptions.test.ts
git commit -m "feat: add theme registry and subscription schema"
```

### Task 2: Distribute collected articles into subscribed themes

**Files:**
- Create: `packages/backend/src/themes/distribution.ts`
- Modify: `packages/backend/src/sources/collect.ts`
- Modify: `packages/backend/src/content/materials.ts`
- Modify: `packages/backend/src/jobs/queue.ts`
- Modify: `packages/backend/src/jobs/content.ts`
- Create: `database/migrations/0062_create_theme_articles.sql`
- Test: `tests/theme-distribution.test.ts`
- Test: `tests/theme-unsubscribe-history.test.ts`

**Interfaces:**
- Consumes:
  - `theme_sources(theme_id, source_id)`
  - global `articles` and `sources`
- Produces:
  - `theme_articles(theme_id: string, article_id: string, source_id: string)`
  - queue payloads that enqueue per-theme editorial work

- [ ] **Step 1: Write failing tests for article distribution and future-only unsubscribe behavior**

```ts
test('one collected article is distributed to every subscribed theme once', async () => {
  const articleId = await collectFixtureArticle('shared-source');
  assert.deepEqual(await themeIdsForArticle(articleId), ['ai', 'finance']);
});

test('unsubscribe stops future distribution but keeps historical theme articles', async () => {
  const before = await collectFixtureArticle('shared-source');
  await unsubscribeTheme('finance', 'shared-source');
  const after = await collectFixtureArticle('shared-source');
  assert.ok(await hasThemeArticle('finance', before));
  assert.ok(!(await hasThemeArticle('finance', after)));
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `DATABASE_URL=postgres://127.0.0.1:5432/myhot_test node --test tests/theme-distribution.test.ts tests/theme-unsubscribe-history.test.ts`
Expected: FAIL because theme distribution does not exist.

- [ ] **Step 3: Add `theme_articles` persistence and distribution helpers**

Implement distribution logic that inserts one row per subscribed theme and guarantees uniqueness on `(theme_id, article_id)`.

- [ ] **Step 4: Enqueue theme-scoped editorial work from collection/material update paths**

Update queue payloads so any article requiring editorial processing schedules work per distributed theme rather than once globally.

- [ ] **Step 5: Run tests to verify they pass**

Run: `DATABASE_URL=postgres://127.0.0.1:5432/myhot_test node --test tests/theme-distribution.test.ts tests/theme-unsubscribe-history.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/backend/src/themes/distribution.ts packages/backend/src/sources/collect.ts packages/backend/src/content/materials.ts packages/backend/src/jobs/queue.ts packages/backend/src/jobs/content.ts database/migrations tests/theme-distribution.test.ts tests/theme-unsubscribe-history.test.ts
git commit -m "feat: distribute collected articles to subscribed themes"
```

### Task 3: Make prompts, taxonomy, scoring, and analyses theme-aware

**Files:**
- Modify: `packages/backend/src/editorial/prompts.ts`
- Modify: `packages/backend/src/editorial/vocabulary.ts`
- Modify: `packages/backend/src/editorial/analyze.ts`
- Modify: `packages/backend/src/editorial/input.ts`
- Modify: `packages/backend/src/editorial/models.ts`
- Modify: `packages/backend/src/admin/content.ts`
- Create: `database/migrations/0063_analyses_theme_scope.sql`
- Create: `database/migrations/0064_editorial_overrides_theme_scope.sql`
- Test: `tests/theme-analysis.test.ts`
- Test: `tests/theme-prompt-version.test.ts`

**Interfaces:**
- Consumes:
  - `loadThemePack(themeId)`
  - `theme_articles`
- Produces:
  - theme-scoped prompt rendering APIs, for example `promptText(themeId, name, values)`
  - theme-scoped analyses keyed by `(theme_id, article_id, ...)`

- [ ] **Step 1: Write failing tests for divergent theme analysis on one article**

```ts
test('the same article can be selected in ai and rejected in finance', async () => {
  const articleId = await distributedFixtureArticle();
  const ai = await analyzeForTheme('ai', articleId);
  const finance = await analyzeForTheme('finance', articleId);
  assert.equal(ai.selected, true);
  assert.equal(finance.selected, false);
});

test('prompt versions include the theme pack content they render', async () => {
  assert.notEqual(promptVersionForTheme('ai', 'selection-score'), promptVersionForTheme('finance', 'selection-score'));
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `DATABASE_URL=postgres://127.0.0.1:5432/myhot_test node --test tests/theme-analysis.test.ts tests/theme-prompt-version.test.ts`
Expected: FAIL because editorial code is still single-theme.

- [ ] **Step 3: Refactor prompt, taxonomy, and vocabulary loaders to take `themeId`**

Change the prompt and taxonomy access layer so editorial logic no longer imports a singleton theme pack.

- [ ] **Step 4: Add `theme_id` to analyses and editorial overrides and persist theme-specific results**

Update analysis writes and admin reads so one global article can hold multiple editorial records safely.

- [ ] **Step 5: Run tests to verify they pass**

Run: `DATABASE_URL=postgres://127.0.0.1:5432/myhot_test node --test tests/theme-analysis.test.ts tests/theme-prompt-version.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/backend/src/editorial/prompts.ts packages/backend/src/editorial/vocabulary.ts packages/backend/src/editorial/analyze.ts packages/backend/src/editorial/input.ts packages/backend/src/editorial/models.ts packages/backend/src/admin/content.ts database/migrations tests/theme-analysis.test.ts tests/theme-prompt-version.test.ts
git commit -m "feat: make editorial analysis theme-aware"
```

### Task 4: Theme-scope publication, grouping, hot ranking, reports, and public ledgers

**Files:**
- Modify: `packages/backend/src/publication/publish.ts`
- Modify: `packages/backend/src/publication/scope.ts`
- Modify: `packages/backend/src/publication/items.ts`
- Modify: `packages/backend/src/publication/timeline.ts`
- Modify: `packages/backend/src/publication/topics.ts`
- Modify: `packages/backend/src/publication/stories.ts`
- Modify: `packages/backend/src/publication/hot.ts`
- Modify: `packages/backend/src/publication/reports.ts`
- Modify: `packages/backend/src/events/*.ts`
- Modify: `packages/backend/src/reports/*.ts`
- Create: `database/migrations/0065_publications_theme_scope.sql`
- Create: `database/migrations/0066_stories_theme_scope.sql`
- Create: `database/migrations/0067_facts_theme_scope.sql`
- Create: `database/migrations/0068_reports_theme_scope.sql`
- Create: `database/migrations/0069_selected_ledger_theme_scope.sql`
- Test: `tests/theme-publication.test.ts`
- Test: `tests/theme-reports.test.ts`
- Test: `tests/theme-hot.test.ts`

**Interfaces:**
- Consumes:
  - theme-scoped analyses
  - `theme_articles`
- Produces:
  - theme-scoped publications, facts, stories, rankings, reports, and selected ledgers
  - read-layer signatures that take `themeId: string`

- [ ] **Step 1: Write failing tests for theme-scoped publication and reports**

```ts
test('publications are independent per theme for the same article', async () => {
  const articleId = await distributedFixtureArticle();
  const ai = await publishForTheme('ai', articleId);
  const finance = await publishForTheme('finance', articleId);
  assert.notEqual(ai.category, finance.category);
});

test('daily reports read only one theme view', async () => {
  const aiDaily = await latestReport('ai', 'daily');
  const financeDaily = await latestReport('finance', 'daily');
  assert.notDeepEqual(aiDaily.content, financeDaily.content);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `DATABASE_URL=postgres://127.0.0.1:5432/myhot_test node --test tests/theme-publication.test.ts tests/theme-reports.test.ts tests/theme-hot.test.ts`
Expected: FAIL because publication and event/report state are global.

- [ ] **Step 3: Theme-scope publication and grouping state**

Add `theme_id` or equivalent theme-aware keys to publication, story, fact, ranking, report, and selected-ledger persistence, then thread `themeId` through all read/write helpers in `publication/`, `events/`, and `reports/`.

- [ ] **Step 4: Preserve single-theme parity for the seeded `ai` theme**

Keep output stable when only `ai` is enabled by matching current behavior under the default theme path.

- [ ] **Step 5: Run tests to verify they pass**

Run: `DATABASE_URL=postgres://127.0.0.1:5432/myhot_test node --test tests/theme-publication.test.ts tests/theme-reports.test.ts tests/theme-hot.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/backend/src/publication packages/backend/src/events packages/backend/src/reports database/migrations tests/theme-publication.test.ts tests/theme-reports.test.ts tests/theme-hot.test.ts
git commit -m "feat: scope publication and reports by theme"
```

### Task 5: Add theme-prefixed public routes for site API, RSS, v1, MCP, and static docs

**Files:**
- Modify: `apps/api/src/routes/site.ts`
- Modify: `apps/api/src/routes/v1.ts`
- Modify: `apps/api/src/routes/feeds.ts`
- Modify: `apps/api/src/routes/mcp.ts`
- Modify: `apps/api/src/routes/static.ts`
- Modify: `packages/contracts/src/site.ts`
- Modify: `packages/contracts/src/mcp.ts`
- Modify: `packages/contracts/src/http-policy.ts`
- Modify: `site/public/openapi-v1.json`
- Test: `tests/theme-routes.test.ts`
- Test: `tests/theme-rss.test.ts`
- Test: `tests/theme-v1.test.ts`
- Test: `tests/theme-mcp.test.ts`

**Interfaces:**
- Consumes: theme-scoped publication read APIs from Task 4.
- Produces:
  - route parsing that resolves `themeId`
  - public route shapes such as `/{theme}/feed.xml`, `/api/v1/themes/:theme/...`, `/api/mcp/:theme`, `/{theme}/llms.txt`

- [ ] **Step 1: Write failing tests for theme-prefixed public endpoints**

```ts
test('root redirects to the configured default theme', async () => {
  const res = await request('/');
  assert.equal(res.status, 302);
  assert.equal(res.headers.location, '/ai');
});

test('theme-prefixed RSS and v1 endpoints do not leak cross-theme content', async () => {
  const ai = await request('/ai/feed.xml');
  const finance = await request('/finance/feed.xml');
  assert.notEqual(ai.text, finance.text);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `DATABASE_URL=postgres://127.0.0.1:5432/myhot_test node --test tests/theme-routes.test.ts tests/theme-rss.test.ts tests/theme-v1.test.ts tests/theme-mcp.test.ts`
Expected: FAIL because public routing is still single-theme.

- [ ] **Step 3: Add theme-aware path parsing and route registration**

Refactor API route modules so every public read endpoint resolves a theme from the URL and passes it into the read layer.

- [ ] **Step 4: Update public contracts and generated/static docs to describe theme-specific endpoints**

Keep field shapes stable where possible while making theme identity part of the resource path.

- [ ] **Step 5: Run tests to verify they pass**

Run: `DATABASE_URL=postgres://127.0.0.1:5432/myhot_test node --test tests/theme-routes.test.ts tests/theme-rss.test.ts tests/theme-v1.test.ts tests/theme-mcp.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/routes packages/contracts/src site/public/openapi-v1.json tests/theme-routes.test.ts tests/theme-rss.test.ts tests/theme-v1.test.ts tests/theme-mcp.test.ts
git commit -m "feat: add theme-prefixed public routes"
```

### Task 6: Update the web app for theme-prefixed navigation and a top-left theme switcher

**Files:**
- Modify: `apps/web/app/routes.ts`
- Modify: `apps/web/app/root.tsx`
- Modify: `apps/web/app/components/shell/Sidebar.tsx`
- Modify: `apps/web/app/features/feed/Filters.tsx`
- Modify: `apps/web/app/lib/seo.ts`
- Modify: `apps/web/app/lib/api.server.ts`
- Modify: `apps/web/app/lib/page-reuse.ts`
- Modify: `apps/web/app/routes/*.tsx` (public routes)
- Create: `apps/web/app/lib/theme.ts`
- Create: `apps/web/app/components/shell/ThemeMenu.tsx`
- Test: `apps/web/tests/theme-navigation.test.ts`
- Test: `apps/web/tests/theme-root-redirect.test.ts`

**Interfaces:**
- Consumes: theme-prefixed API endpoints from Task 5.
- Produces:
  - nested public routes under `/:theme`
  - theme-aware path helpers
  - UI switcher that preserves page type when possible and falls back to theme home

- [ ] **Step 1: Write failing web tests for theme-prefixed navigation**

```ts
test('public home renders under /:theme and root redirects to the default theme', async () => {
  const res = await render('/');
  assert.equal(res.status, 302);
  assert.equal(res.headers.location, '/ai');
});

test('theme switcher sends /ai/daily to /finance/daily', async () => {
  const page = await open('/ai/daily');
  await page.click('[data-theme-switcher]');
  await page.click('text=Finance');
  assert.equal(page.location.pathname, '/finance/daily');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run build -w @aihot/web && node --test apps/web/tests/theme-navigation.test.ts apps/web/tests/theme-root-redirect.test.ts`
Expected: FAIL because routes and links are still theme-less.

- [ ] **Step 3: Introduce theme path helpers and migrate public route modules to `/:theme/...`**

Add one shared theme-path utility and update all public links, breadcrumbs, canonical paths, API fetches, and RSS links to derive from the active theme.

- [ ] **Step 4: Replace the static wordmark links with a theme switcher on phone and desktop chrome**

Use the existing menu patterns so the top-left control chooses among enabled themes while preserving the current page type where possible.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run build -w @aihot/web && node --test apps/web/tests/theme-navigation.test.ts apps/web/tests/theme-root-redirect.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/routes.ts apps/web/app/root.tsx apps/web/app/components/shell/Sidebar.tsx apps/web/app/features/feed/Filters.tsx apps/web/app/lib apps/web/app/routes apps/web/tests/theme-navigation.test.ts apps/web/tests/theme-root-redirect.test.ts
git commit -m "feat: add theme-prefixed web navigation"
```

### Task 7: Add phase-1 admin controls for default theme and theme↔source subscriptions

**Files:**
- Modify: `packages/contracts/src/admin.ts`
- Modify: `packages/backend/src/admin/settings.ts`
- Modify: `packages/backend/src/admin/sources.ts`
- Modify: `apps/api/src/routes/admin.ts` or the admin route modules that expose settings and source detail actions
- Modify: `apps/web/app/routes/admin/settings.tsx`
- Modify: `apps/web/app/routes/admin/source.tsx`
- Create: `apps/web/app/routes/admin/themes.tsx`
- Test: `tests/admin-themes.test.ts`
- Test: `tests/admin-source-theme-subscriptions.test.ts`

**Interfaces:**
- Consumes:
  - `themes`
  - `theme_sources`
- Produces:
  - admin DTOs for themes, default theme, and source subscriptions
  - UI to set the default theme and subscribe/unsubscribe themes from a source

- [ ] **Step 1: Write failing tests for admin theme configuration**

```ts
test('admin can set the default theme', async () => {
  await setDefaultTheme('finance');
  assert.equal(await currentDefaultTheme(), 'finance');
});

test('admin source detail shows which themes subscribe to the source', async () => {
  const detail = await sourceDetail('shared-source');
  assert.ok(detail.themes.some((t) => t.theme_id === 'ai'));
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `DATABASE_URL=postgres://127.0.0.1:5432/myhot_test node --test tests/admin-themes.test.ts tests/admin-source-theme-subscriptions.test.ts`
Expected: FAIL because admin contracts and routes do not expose themes.

- [ ] **Step 3: Add theme admin DTOs and endpoints**

Extend admin contracts and backend handlers so the settings page can read and update the default theme and the source pages can manage subscriptions.

- [ ] **Step 4: Add admin UI for theme list, default theme, and source subscriptions**

Follow existing admin page patterns and keep prompt/taxonomy editing out of scope.

- [ ] **Step 5: Run tests to verify they pass**

Run: `DATABASE_URL=postgres://127.0.0.1:5432/myhot_test node --test tests/admin-themes.test.ts tests/admin-source-theme-subscriptions.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/contracts/src/admin.ts packages/backend/src/admin apps/api/src/routes apps/web/app/routes/admin tests/admin-themes.test.ts tests/admin-source-theme-subscriptions.test.ts
git commit -m "feat: add admin controls for themes"
```

### Task 8: Backfill the seeded `ai` theme, verify single-theme parity, and run end-to-end checks

**Files:**
- Modify: `scripts/smoke.ts`
- Modify: `tests/architecture.test.ts`
- Modify: `tests/publication.test.ts`
- Modify: `tests/report-outlets.test.ts`
- Create: `tests/theme-single-parity.test.ts`
- Create: `docs/deploy.md` (update rollout notes)

**Interfaces:**
- Consumes: all theme-aware runtime layers from Tasks 1–7.
- Produces:
  - parity checks that `ai` alone behaves like the current site
  - smoke coverage for theme-prefixed public routes
  - rollout notes for seeding the first theme and enabling later themes

- [ ] **Step 1: Write failing parity and smoke tests**

```ts
test('with only ai enabled, the default theme reproduces current single-theme outputs', async () => {
  const home = await request('/ai');
  assert.equal(home.status, 200);
  assert.match(home.text, /精选/);
});

test('smoke script accepts a theme-prefixed base route', async () => {
  const result = await smoke('http://localhost:3000/ai');
  assert.equal(result.ok, true);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `DATABASE_URL=postgres://127.0.0.1:5432/myhot_test node --test tests/theme-single-parity.test.ts`
Expected: FAIL because parity and smoke coverage are not theme-aware.

- [ ] **Step 3: Update architecture checks, smoke flow, and deployment notes for the seeded default theme rollout**

Make the architecture test enforce explicit theme scoping in public reads, update smoke coverage to hit theme-prefixed routes, and document the seed-and-enable rollout in `docs/deploy.md`.

- [ ] **Step 4: Run full verification**

Run: `npm run typecheck`
Expected: PASS

Run: `DATABASE_URL=postgres://127.0.0.1:5432/myhot_test npm test`
Expected: PASS

Run: `npm run build -w @aihot/web && node --test apps/web/tests/*.test.ts`
Expected: PASS

Run: `node scripts/smoke.ts --base http://localhost:3000/ai`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/smoke.ts tests/architecture.test.ts tests/publication.test.ts tests/report-outlets.test.ts tests/theme-single-parity.test.ts docs/deploy.md
git commit -m "test: verify multi-theme parity and rollout"
```
