// Shared setup for the invariant tests (node --test tests/). They write rows, so they refuse to run
// unless DATABASE_URL names a throwaway database ending in _test or _ci.
// Secrets are test values set here, never real credentials; paid providers are pointed at local stubs
// by the tests that need them, and the push valves stay off. npm test gives each database test file its own copy of
// the database (databases.ts).
import http from "node:http";
import { after, beforeEach } from "node:test";
import "./env.ts";
import { beijingAt, createHash, EDITION_TIMES, PRESETS } from "./env.ts";

const database = new URL(process.env.DATABASE_URL ?? "postgres://unset/unset").pathname.slice(1);

const { config } = await import("@aihot/backend/config");
config.modelCallsEnabled = true;
let sql!: (typeof import("@aihot/backend/db"))["sql"];
let closeDb: (() => Promise<void>) | undefined;
if (database !== "standalone_test") ({ sql, closeDb } = await import("@aihot/backend/db"));
export { sql };

if (database !== "standalone_test") {
  after(async () => {
    await closeDb?.();
  });

  beforeEach(async () => {
    await sql`UPDATE themes SET is_default = (id = 'ai') WHERE is_default <> (id = 'ai')`;
  });
}

/**
 * Sends the calls of the named model presets to a stub: sets each one's address and key variables, which
 * the site's presets name. By default the providers of the article analysis (DashScope, GLM, DeepSeek).
 */
export function pointModels(url: string, models = ["qwen3.7-flash", "glm-5.3-flash", "deepseek-flash"], env: NodeJS.ProcessEnv = process.env) {
  for (const name of models) {
    const preset = PRESETS[name];
    if (!preset) throw new Error(`the site has no model preset ${name}`);
    env[preset.baseUrlEnv] = `${url}/v1`;
    env[preset.apiKeyEnv] = "test-key";
  }
}

/**
 * A local HTTP stub standing in for a paid provider; `answer` builds every response from the request
 * (it may wait, to hold a request open while a test changes something).
 */
export async function stub(answer: (hit: number, req: { url: string; body: string }) => unknown) {
  let hits = 0;
  const server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", async () => {
      hits += 1;
      const out = await answer(hits, { url: req.url ?? "/", body: Buffer.concat(chunks).toString("utf8") });
      const reply = out instanceof Reply ? out : { status: 200, json: out };
      res.writeHead(reply.status, { "content-type": "application/json" });
      res.end(JSON.stringify(reply.json));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const { port } = server.address() as { port: number };
  return { url: `http://127.0.0.1:${port}`, hits: () => hits, close: () => new Promise<void>((resolve) => server.close(() => resolve())) };
}

/**
 * The embeddings provider as a stub of its own (DASHSCOPE_BASE_URL), so chat stubs count only their
 * calls. A text's vector marks the pairs of adjacent characters it contains, hashed into the model's
 * 1,024 dimensions: texts that share wording come out close, texts that share none do not.
 */
export async function embeddingsStub() {
  const vector = (text: string) => {
    const out = Array<number>(1024).fill(0);
    const chars = [...text.replace(/\s+/g, "")];
    for (let i = 0; i + 1 < chars.length; i++) out[createHash("sha256").update(chars[i]! + chars[i + 1]!).digest().readUInt16BE(0) % 1024] = 1;
    return out;
  };
  const server = await stub((_hit, req) => ({ data: (JSON.parse(req.body).input as string[]).map((text, index) => ({ index, embedding: vector(text) })) }));
  process.env.DASHSCOPE_BASE_URL = `${server.url}/v1`;
  process.env.DASHSCOPE_API_KEY = "test-key";
  return server;
}

/** A stub answer with its own status (e.g. a provider's 503); anything else is a 200 JSON body. */
export class Reply {
  readonly status: number;
  readonly json: unknown;
  constructor(status: number, json: unknown) {
    this.status = status;
    this.json = json;
  }
}

/** A promise with its resolve function, to hold a stub's answer until a test releases it. */
export function gate<T = void>() {
  let open!: (value: T) => void;
  const promise = new Promise<T>((resolve) => (open = resolve));
  return { promise, open };
}

/** A short unique tag for the rows a test creates. */
export const tag = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

/** `seconds` after the site's edition time of a report kind on a Beijing date (EDITION_TIMES), so tests follow the site's schedule. */
export const editionAt = (kind: keyof typeof EDITION_TIMES, date: string, seconds = 0) => new Date(beijingAt(date, EDITION_TIMES[kind]).getTime() + seconds * 1000);
