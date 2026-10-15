// Every database test file runs on its own copy of the database, so the files run in parallel
// without sharing rows, paid-service budgets or an order (package.json). DATABASE_URL names the
// template, a throwaway database ending in _test or _ci (setup.ts refuses anything else); it is
// created if missing. As the runner's global setup this module brings the template up to date
// (migrations) and removes the copies and scratch folders of the run; as a preload in each
// file's process it copies the template and gives the file its own data and temporary folders.
// *.standalone.test.ts need no database copy; npm run test:standalone runs them without a database.
import "./env.ts";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isMainThread } from "node:worker_threads";
import postgres from "postgres";

const template = new URL(process.env.DATABASE_URL!);
const name = decodeURIComponent(template.pathname.slice(1));
const suffix = name.slice(name.lastIndexOf("_") + 1);
const copyPattern = `^${name.replace(/\W/g, "\\$&")}_f[0-9]+_${suffix}$`;
const runnerId = process.env.NODE_TEST_CONTEXT ? process.ppid : process.pid;
const dumpPath = path.join(tmpdir(), `aihot-test-template-${name}-${runnerId}.dump`);
const templateOwner = decodeURIComponent(template.username || "");
const canUseLocalAdminFallback = template.hostname === "127.0.0.1" || template.hostname === "localhost";

const quoteIdent = (value: string) => `"${value.replaceAll('"', '""')}"`;

function localAdmin(sqlText: string) {
  execFileSync("psql", ["-d", "postgres", "-v", "ON_ERROR_STOP=1", "-c", sqlText], {
    stdio: ["ignore", "ignore", "inherit"],
  });
}

function urlOf(database: string) {
  const url = new URL(template);
  url.pathname = `/${database}`;
  return url.toString();
}

async function onServer(fn: (db: postgres.Sql) => Promise<unknown>) {
  const db = postgres(urlOf("postgres"), { max: 1, onnotice: () => {} });
  try {
    await fn(db);
  } finally {
    await db.end();
  }
}

async function createDatabase(database: string) {
  try {
    await onServer(async (db) => {
      await db`CREATE DATABASE ${db(database)}`;
    });
  } catch (error) {
    if (!(canUseLocalAdminFallback && (error as { code?: string }).code === "42501")) throw error;
    localAdmin(`CREATE DATABASE ${quoteIdent(database)}${templateOwner ? ` OWNER ${quoteIdent(templateOwner)}` : ""}`);
  }
}

async function dropDatabase(database: string) {
  try {
    await onServer(async (db) => {
      await db`DROP DATABASE IF EXISTS ${db(database)} WITH (FORCE)`;
    });
  } catch (error) {
    if (!(canUseLocalAdminFallback && (error as { code?: string }).code === "42501")) throw error;
    localAdmin(`DROP DATABASE IF EXISTS ${quoteIdent(database)} WITH (FORCE)`);
  }
}

const dropCopies = () =>
  onServer(async (db) => {
    for (const { datname } of await db<{ datname: string }[]>`SELECT datname FROM pg_database WHERE datname ~ ${copyPattern}`) {
      await dropDatabase(datname);
    }
  });

const dumpTemplate = () =>
  execFileSync("pg_dump", ["--format=custom", "--compress=6", "--no-owner", "--file", dumpPath, urlOf(name)], {
    stdio: ["ignore", "ignore", "inherit"],
  });

const restoreCopy = (database: string) =>
  execFileSync("pg_restore", ["--no-owner", "--clean", "--if-exists", "--dbname", urlOf(database), dumpPath], {
    stdio: ["ignore", "ignore", "inherit"],
  });

export async function globalSetup() {
  await onServer(async (db) => {
    if ((await db`SELECT 1 FROM pg_database WHERE datname = ${name}`).length === 0) await createDatabase(name);
  });
  execFileSync(process.execPath, [fileURLToPath(new URL("../scripts/migrate.ts", import.meta.url))], { stdio: ["ignore", "ignore", "inherit"] });
  // Pipeline tests insert a source and process it as the original single theme. Production does not
  // do this: a source with no subscription is not analyzed. The trigger only exists on the test template.
  const templateDb = postgres(urlOf(name), { max: 1, onnotice: () => {} });
  try {
    await templateDb.unsafe(`
      CREATE OR REPLACE FUNCTION test_subscribe_default_theme() RETURNS trigger
      LANGUAGE plpgsql AS $$
      BEGIN
        INSERT INTO theme_sources (theme_id, source_id, enabled)
        VALUES ('ai', NEW.id, true)
        ON CONFLICT (theme_id, source_id) DO NOTHING;
        RETURN NEW;
      END $$;
      DROP TRIGGER IF EXISTS test_subscribe_default_theme ON sources;
      CREATE TRIGGER test_subscribe_default_theme
      AFTER INSERT ON sources
      FOR EACH ROW EXECUTE FUNCTION test_subscribe_default_theme()`);
  } finally {
    await templateDb.end();
  }
  dumpTemplate();
  await dropCopies(); // left by an interrupted run
}

// Each file's scratch folder is named after the runner, so a run removes only its own leftovers.
const scratchPrefix = (runner: number) => `aihot-test-${runner}-`;

export async function globalTeardown() {
  await dropCopies();
  rmSync(dumpPath, { force: true });
  for (const entry of readdirSync(tmpdir())) {
    if (entry.startsWith(scratchPrefix(process.pid))) rmSync(path.join(tmpdir(), entry), { recursive: true, force: true }); // a crashed file's
  }
}

// Worker threads a file starts inherit the preload and its copy.
if (process.env.NODE_TEST_CONTEXT && isMainThread) {
  if (process.argv[1]?.endsWith(".standalone.test.ts")) {
    await import("./standalone.ts");
  } else {
    const copy = `${name}_f${process.pid}_${suffix}`;
    await dropDatabase(copy);
    await createDatabase(copy);
    restoreCopy(copy);
    process.env.DATABASE_URL = urlOf(copy);
  }
  const scratch = mkdtempSync(path.join(tmpdir(), scratchPrefix(process.ppid)));
  for (const dir of ["data", "tmp"]) mkdirSync(path.join(scratch, dir));
  process.env.AIHOT_DATA_DIR = path.join(scratch, "data");
  process.env.TMPDIR = path.join(scratch, "tmp"); // os.tmpdir(): whatever the file creates goes with it
  await import("./setup.ts");
  process.on("exit", () => rmSync(scratch, { recursive: true, force: true }));
}
