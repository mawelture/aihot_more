# Multi-theme Site Design

## Goal

Evolve AIHOT from a single-industry site into one site that can host multiple independent themes (for example `ai`, `finance`) without duplicating collection work. Each theme should behave like the current site from the reader's perspective, but themes may share the same global sources and the same raw collected materials. A single article or event may appear in multiple themes if each theme independently selects it.

## Product decisions confirmed

### Reader-facing behavior

- The public site has **no global aggregate view**.
- Every public page belongs to a theme.
- The root path `/` redirects to the configured default theme.
- Theme URLs are path-based, for example:
  - `/{theme}`
  - `/{theme}/all`
  - `/{theme}/hot`
  - `/{theme}/topics`
  - `/{theme}/daily`
- The top-left wordmark becomes a theme switcher.
- Switching theme should preserve the current page type when possible and fall back to the target theme home when a resource cannot be mapped.

### Theme semantics

- A site may contain multiple themes.
- Each theme has its own:
  - source subscriptions
  - editorial prompts
  - taxonomy and topics
  - selection thresholds
  - daily / weekly / monthly reports
- Themes are **not mutually exclusive**.
- The same raw article or real-world event may appear in multiple themes.
- If two themes subscribe to the same global source, collection still runs once; the collected content is then distributed to each subscribed theme.
- Unsubscribing a theme from a source only affects **future distribution**. Historical theme content remains intact unless a separate explicit cleanup action is introduced later.

### Source management

- Sources remain **global objects**.
- Themes only express **subscribe / unsubscribe** relationships to global sources.
- Themes do **not** override collection properties such as interval, tier, participation mode, or full-text licensing.
- Collection scheduling and execution remain globally managed.

### Configuration management

- Initial implementation remains **code-file driven**.
- Theme definitions, prompts, taxonomy, topics, and selection thresholds are maintained in the repository, not edited in the admin UI.
- Admin UI in the first phase only manages:
  - default theme
  - which themes are enabled
  - theme ↔ source subscriptions

## Architecture

The system splits into four layers.

### 1. Global collection layer

This layer remains single-copy and theme-agnostic:

- `sources`
- `fetch_runs`
- `articles`
- `article_revisions`
- `article_discoveries`
- `translations`
- paid request receipts for shared collection/extraction/translation work where the work is not theme-specific

Its job is only to answer: “what material exists and what do we know about it globally?”

### 2. Theme configuration layer

Each theme is a code package containing:

- prompts
- taxonomy
- topics
- selection thresholds
- theme identity metadata used by public routes and docs

This layer answers: “how does this theme judge and present material?”

### 3. Theme editorial layer

For each `(theme, article)` pair, the system independently performs:

- prefilter
- scoring
- structure extraction
- understanding / summarization
- publication projection
- story / fact grouping
- hot ranking
- daily / weekly / monthly report generation

This layer answers: “how does this theme interpret this material?”

### 4. Theme public layer

All public read paths become theme-specific:

- website pages
- RSS
- API
- MCP
- agent docs
- `llms.txt`
- sitemap branches

This layer answers: “what does a reader or tool see for this theme?”

## Data model

### New core tables

#### `themes`

Defines public themes.

Suggested fields:

- `id` (stable key such as `ai`, `finance`)
- `name`
- `path_prefix` (normally the same as `id`)
- `enabled`
- `is_default`
- `pack_key` (maps runtime to the theme code package)
- timestamps

Rules:

- exactly one default theme among enabled themes
- disabled themes are unavailable to public routing

#### `theme_sources`

Subscription relationship between a theme and a global source.

Suggested fields:

- `theme_id`
- `source_id`
- `enabled`
- `subscribed_at`
- `updated_at`

Rules:

- no collection configuration lives here
- this table only decides whether new material from a global source is distributed into a theme

#### `theme_articles`

Distribution record from global article to theme.

Suggested fields:

- `theme_id`
- `article_id`
- `source_id`
- `created_at`

Uniqueness:

- unique `(theme_id, article_id)`

Purpose:

- one global article may be sent to many themes
- historical distribution remains even after later unsubscribe

### Theme-scoped editorial tables

The following single-theme concepts must become theme-scoped, either by adding `theme_id` or by replacing them with new theme-aware tables whose primary key includes theme identity:

- analyses
- editorial overrides
- publications
- facts / fact_articles
- stories and story merge state
- hot ranking state
- reports / report navigation / report correction state
- selected ledger used by public sync APIs

Design rule:

> A global `article` is shared; every theme owns its own analysis, publication, grouping, ranking, and reports.

This avoids collisions where the same source material should be categorized, scored, grouped, or selected differently in different themes.

## Theme code layout

Replace the old single-pack layout with per-theme packs.

Suggested structure:

```text
/themes
  /ai
    taxonomy.ts
    topics.json
    selection.ts
    prompts/
  /finance
    taxonomy.ts
    topics.json
    selection.ts
    prompts/
  index.ts
```

`themes/index.ts` exports:

- all available theme pack metadata
- loader helpers
- any static fallback default used before DB config is read

Runtime access changes from old singleton imports to theme-aware loaders such as `loadThemePack(themeId)`.

## Processing flow

### Collection

1. Scheduler collects from global `sources`.
2. Candidates are deduplicated into global `articles`.
3. Extraction / translation / revision handling remains global.

### Distribution

When an article belongs to `source_id = S`:

1. Query enabled `theme_sources` rows for `S`.
2. Insert `theme_articles(theme_id, article_id)` for each subscribed theme.
3. Enqueue theme editorial work for each `(theme_id, article_id)` pair.

### Theme editorial processing

Each pair independently loads that theme pack and runs:

- prefilter
- score
- structure
- understand / summarize
- publication projection

Results may differ across themes.

### Grouping and reports

Grouping, hot ranking, and report composition read only theme-scoped publication state.

This allows:

- the same article in both `ai` and `finance`
- different titles / summaries / categories / tags / scores per theme
- different story boundaries and report placement per theme

## Public routing and read APIs

### Website routes

All public routes require a theme prefix:

- `/{theme}`
- `/{theme}/all`
- `/{theme}/hot`
- `/{theme}/topics`
- `/{theme}/topics/:slug`
- `/{theme}/daily`
- `/{theme}/weekly`
- `/{theme}/monthly`
- `/{theme}/items/:id`
- `/{theme}/story/:publicId`

`/` redirects to the configured default theme.

### RSS

Theme-specific RSS endpoints, for example:

- `/{theme}/feed.xml`
- `/{theme}/feed/full.xml`
- `/{theme}/feed/all.xml`
- `/{theme}/feed/daily.xml`
- `/{theme}/feed/weekly.xml`
- `/{theme}/feed/monthly.xml`
- `/{theme}/feed/category/:key.xml`

### API

Theme-specific public API paths, for example:

- `/api/v1/themes/:theme/items`
- `/api/v1/themes/:theme/hot-topics`
- `/api/v1/themes/:theme/dailies/latest`
- `/api/v1/themes/:theme/weeklies/latest`
- `/api/v1/themes/:theme/monthlies/latest`
- `/api/v1/themes/:theme/selected/snapshot`
- `/api/v1/themes/:theme/selected/changes`
- `/api/v1/themes/:theme/stories/:id`

### MCP and tool docs

Theme-specific public surfaces are preferred over a single mixed server:

- `/api/mcp/:theme`
- `/{theme}/agent`
- `/{theme}/llms.txt`
- `/{theme}/openapi-v1.json`

### Sitemap

Use a root sitemap index that points to per-theme sitemaps:

- `/sitemap.xml`
- `/{theme}/sitemap.xml`

`robots.txt` may remain global.

## Frontend behavior

### Theme switcher

The top-left wordmark becomes a theme switcher showing enabled themes.

Switch rules:

- preserve page type when possible (`/ai/daily` → `/finance/daily`)
- preserve exact resource only when resource identity exists in the target theme
- otherwise fall back to the target theme home page

### No aggregate site view

There is no all-themes home page, feed, or hot page in phase 1.

## Admin behavior in phase 1

### New capabilities

- list themes
- mark one theme as default
- enable / disable themes
- subscribe / unsubscribe a theme from global sources
- inspect, from either side, which sources a theme subscribes to and which themes a source is distributed to

### Explicitly not in phase 1

- create new themes in admin
- edit prompts in admin
- edit taxonomy / topics / thresholds in admin
- theme-specific source collection overrides

## Migration and compatibility strategy

### Principle

Treat the current single-industry site as the first theme, likely `ai`.

### Suggested migration shape

1. Add `themes`, `theme_sources`, `theme_articles` and seed the current site as the first theme.
2. Subscribe that first theme to all currently enabled sources.
3. Theme-scope editorial tables while preserving current behavior for the first theme.
4. Route existing public pages through the default theme.
5. Add a second theme only after first-theme parity is restored.

### Compatibility target

Before any second theme is introduced, the seeded first theme must produce the same public behavior as today's site.

## Non-goals for phase 1

- cross-theme aggregate public views
- cross-theme shared editorial analyses
- implicit historical cleanup after unsubscribe
- per-theme collection scheduling or source overrides
- admin-managed theme pack authoring

## Risks and mitigation

### Risk 1: theme identity leaks are missed in read paths

Mitigation:

- require every public read-layer entry point to take `theme_id`
- add architecture tests that reject theme-less public queries where theme scoping is required

### Risk 2: same article with different theme outputs collides in current unique keys

Mitigation:

- change uniqueness / primary keys so theme-scoped editorial records can coexist cleanly

### Risk 3: route and cache confusion between themes

Mitigation:

- encode theme in public paths and API paths
- ensure cache keys and ETags include theme identity

### Risk 4: migration changes too many surfaces at once

Mitigation:

- phase the implementation: data model → distribution → editorial theme scoping → public routing → secondary public surfaces

## Phase 1 acceptance criteria

1. At least two themes can coexist, for example `ai` and `finance`.
2. Both themes can subscribe to the same global RSS source.
3. That source is collected only once.
4. One collected article can be distributed to both themes.
5. Different themes can produce different editorial results from the same article.
6. Public routes work at least for:
   - `/{theme}`
   - `/{theme}/daily`
   - `/{theme}/weekly`
   - `/{theme}/monthly`
   - `/{theme}/hot`
   - `/{theme}/topics`
7. `/` redirects to the configured default theme.
8. Unsubscribing a theme from a source stops future distribution to that theme without deleting historical theme content.
9. With only the seeded first theme enabled, public behavior matches the current site.
