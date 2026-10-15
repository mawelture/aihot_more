import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createServer } from "node:http";
import { startWebServer, type WebServer } from "./web-server.ts";

let web: WebServer;
let origin: string;

const api = createServer((req, res) => {
  const url = new URL(req.url!, "http://api.local");
  res.setHeader("Content-Type", "application/json");
  if (url.pathname === "/api/site/meta") return res.end(JSON.stringify({ changelogVersion: "2026-10-11T12:00" }));
  res.statusCode = 404;
  res.end(JSON.stringify({ code: "not_found" }));
});

before(async () => {
  web = await startWebServer(api);
  origin = web.origin;
});

after(async () => { if (web) await web.stop(); });

test("public root redirects to the default theme", async () => {
  const res = await fetch(`${origin}/`, { redirect: "manual" });
  assert.equal(res.status, 302);
  assert.equal(res.headers.get("location"), "/ai");
});
