import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createServer } from "node:http";
import { startWebServer, type WebServer } from "./web-server.ts";

let web: WebServer;
let origin: string;

const report = (theme: string) => ({
  index: [{ key: "2026-10-11", title: `${theme} daily`, issueNumber: 1 }],
  report: {
    kind: "daily",
    key: "2026-10-11",
    issueNumber: 1,
    title: `${theme} daily`,
    generatedAt: "2026-10-11T08:00:00.000Z",
    lead: { title: `${theme} headline`, leadParagraph: `${theme} lead` },
    leadItemId: null,
    overview: `${theme} overview`,
    highlights: [],
    metrics: { totalEvents: 1, totalStories: 1, sourcesCount: 1, firstPartyEvents: 0, selectedCount: 1, reportsCovered: 1 },
    sections: [],
    flashes: [],
    cover: null,
    releaseUnit: null,
    readingMinutes: 1,
    prev: null,
    next: null,
  },
});

const api = createServer((req, res) => {
  const url = new URL(req.url!, "http://api.local");
  res.setHeader("Content-Type", "application/json");
  if (url.pathname === "/api/site/meta") return res.end(JSON.stringify({ changelogVersion: "2026-10-11T12:00" }));
  if (url.pathname === "/api/site/themes/ai/reports/daily/latest-page") return res.end(JSON.stringify(report("ai")));
  if (url.pathname === "/api/site/themes/macro/reports/daily/latest-page") return res.end(JSON.stringify(report("macro")));
  if (url.pathname === "/api/site/themes/quant/reports/daily/latest-page") return res.end(JSON.stringify(report("quant")));
  if (url.pathname === "/api/site/themes/web3/reports/daily/latest-page") return res.end(JSON.stringify(report("web3")));
  res.statusCode = 404;
  res.end(JSON.stringify({ code: "not_found" }));
});

before(async () => {
  web = await startWebServer(api);
  origin = web.origin;
});

after(async () => { if (web) await web.stop(); });

function navText(html: string, href: string): string {
  for (const [anchor] of html.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/g)) {
    if (/href="([^"]*)"/.exec(anchor)?.[1] !== href) continue;
    const label = /min-w-0 truncate">([^<]*)/.exec(anchor)?.[1];
    if (label) return label;
  }
  assert.fail(`missing nav link ${href}`);
}

test("theme-prefixed report page renders and exposes a theme switch target for the same page type", async () => {
  const res = await fetch(`${origin}/ai/daily`);
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /data-theme-switcher/);
  assert.match(html, /href="\/macro\/daily"/);
  assert.match(html, /href="\/quant\/daily"/);
  assert.match(html, /href="\/web3\/daily"/);
  assert.equal(navText(html, "/ai/daily"), "AI 日报");
  assert.equal(navText(html, "/ai/all"), "全部 AI 动态");
});

test("each theme's sidebar uses that theme's name in the daily and all labels", async () => {
  const res = await fetch(`${origin}/macro/daily`);
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.equal(navText(html, "/macro/daily"), "宏观日报");
  assert.equal(navText(html, "/macro/all"), "全部宏观动态");
});

test("theme-prefixed more page keeps internal utility links under the active theme", async () => {
  const res = await fetch(`${origin}/ai/more`);
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /href="\/ai\/terms"/);
  assert.match(html, /href="\/ai\/privacy"/);
  assert.match(html, /href="\/ai\/feed\.xml"/);
});
