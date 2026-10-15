// Shared test environment for the invariant suites. Keep this free of imports that read DATABASE_URL
// or open database connections: tests/databases.ts loads it before swapping each file onto its own copy.
import { createHash } from "node:crypto";
import { beijingAt } from "@aihot/contracts/time";
import { EDITION_TIMES } from "@aihot/site";
import { DEFAULTS, PRESETS } from "@aihot/site/models";

const database = new URL(process.env.DATABASE_URL ?? "postgres://unset/unset").pathname.slice(1);
if (!/_(test|ci)$/.test(database)) {
  throw new Error(`Invariant tests write rows: point DATABASE_URL at a throwaway database named *_test or *_ci (got "${database}")`);
}
process.env.AIHOT_CREDENTIALS_DIR = "/nonexistent-test-credentials";
process.env.SESSION_SECRET ??= "test-session-secret-0123456789";
process.env.IMG_PROXY_SIGN_SECRET ??= "test-img-secret-0123456789";
process.env.FEISHU_CONTENT_PUSH_ENABLED = "false";
process.env.INDEXNOW_SUBMIT_ENABLED = "false";
process.env.LOG_LEVEL ??= "error";
process.env.MODEL_CALLS_ENABLED = "true";
process.env.COLLECT_ENABLED = "true";

const STEP_MODELS: Record<string, [env: string, model: string]> = {
  prefilter: ["PREFILTER_MODEL", "qwen3.7-flash"], score: ["SCORE_MODEL", "glm-5.3-flash-selection"], understand: ["UNDERSTAND_MODEL", "glm-5.3-flash"],
  summarize: ["SUMMARIZE_MODEL", "deepseek-flash"], structure: ["STRUCTURE_MODEL", "qwen3.8-flash"], group: ["GROUP_MODEL", "deepseek-flash"],
  groupReview: ["GROUP_REVIEW_MODEL", "mimo-v2.6-flash"], digest: ["DIGEST_MODEL", "deepseek-flash"], report: ["REPORT_MODEL", "deepseek-flash"],
  translate: ["TRANSLATE_MODEL", "deepseek-flash"],
};
for (const [step, [env, model]] of Object.entries(STEP_MODELS)) if (!DEFAULTS[step]) process.env[env] ??= model;

export const testDatabase = database;
export { beijingAt, createHash, EDITION_TIMES, PRESETS };
