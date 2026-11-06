#!/usr/bin/env node
/**
 * Local PostgreSQL for the e2e tests (PLAN 2026-11-05 §1.5, §5.1, §5.2). NEVER production.
 *
 *   node scripts/e2e-db.mjs start    initdb once (C:/Users/guill/dev/arcana-e2e-pg) + pg_ctl start on 127.0.0.1:54329
 *   node scripts/e2e-db.mjs reset    drop/create arcana_e2e, prisma db push, seeds and the e2e fixtures
 *   node scripts/e2e-db.mjs serve    start + reset + next build + next start -p 3000 (Playwright's webServer)
 *   node scripts/e2e-db.mjs stop     pg_ctl stop
 *   node scripts/e2e-db.mjs status   is the cluster up?
 *   node scripts/e2e-db.mjs check [--root <dir>]   only the guards (the jest test runs this)
 *
 * Guards, before anything touches a database:
 * 1. `.env.e2e` sets DATABASE_URL and DIRECT_URL; both must match
 *    /@(localhost|127\.0\.0\.1):54329\// AND parse to host localhost/127.0.0.1, port 54329.
 * 2. Key parity: every key of `.env` (production), `.env.local`, `.env.production*`
 *    and `prisma/.env` must be in `.env.e2e` with a value, so Next, the Prisma CLI and
 *    @prisma/client (which load `.env` on their own) inherit nothing from production.
 *    Only the NAMES of the keys are read from those files; values are never printed.
 * 3. The `.env.e2e` values are written over `process.env` (they win over the shell) and
 *    every child gets that env explicitly; the URLs are checked again before each spawn.
 *
 * Knobs (all optional): ARCANA_E2E_SKIP_RESET=1 and ARCANA_E2E_SKIP_BUILD=1 for fast
 * re-runs of `serve`; ARCANA_PG_BIN (folder with initdb/pg_ctl/psql); ARCANA_E2E_PGDATA.
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const LOCAL_DB_URL = /@(localhost|127\.0\.0\.1):54329\//;
const PG_PORT = 54329;
const DB_NAME = "arcana_e2e";
const APP_PORT = 3000;

/** Files Next, the Prisma CLI or @prisma/client may load on their own. */
const INHERITABLE_ENV_FILES = [".env", ".env.local", ".env.production", ".env.production.local", "prisma/.env"];

const SEEDS = [
  "prisma/seed.ts",
  "prisma/seed-achievements.ts",
  "prisma/seed-challenges.ts",
  "prisma/seed-themed-spreads.ts",
  "prisma/seed-blog.ts",
  "prisma/add-slugs.ts",
];
const FIXTURES = "e2e/fixtures/sembrar.ts";

const PRISMA_CLI = path.join(ROOT, "node_modules", "prisma", "build", "index.js");
const TSX_CLI = path.join(ROOT, "node_modules", "tsx", "dist", "cli.mjs");
const NEXT_CLI = path.join(ROOT, "node_modules", "next", "dist", "bin", "next");

const PG_BIN = process.env.ARCANA_PG_BIN || "C:/Users/guill/scoop/apps/postgresql/current/bin";
const PGDATA = path.resolve(process.env.ARCANA_E2E_PGDATA || "C:/Users/guill/dev/arcana-e2e-pg");
const PG_LOG = path.join(PGDATA, "e2e-server.log");

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

const log = (message) => console.log(`[e2e-db] ${message}`);

function fail(message) {
  console.error(`[e2e-db] ABORTED: ${message}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

/** True only for a URL on localhost/127.0.0.1, port 54329 (regex AND parsed host/port). */
function isLocalE2eUrl(value) {
  if (typeof value !== "string" || !LOCAL_DB_URL.test(value)) return false;
  try {
    const url = new URL(value);
    return (url.hostname === "localhost" || url.hostname === "127.0.0.1") && url.port === String(PG_PORT);
  } catch {
    return false;
  }
}

/** Key names of an env file (empty if it doesn't exist). Values are parsed and dropped. */
function envKeys(file) {
  if (!existsSync(file)) return [];
  return Object.keys(parseEnv(readFileSync(file, "utf8")));
}

/**
 * Reads `.env.e2e` from `root` and runs guards 1 and 2. Returns the parsed values.
 * Aborts the process (exit 1) on any problem, naming keys but never printing values.
 */
function loadE2eEnv(root = ROOT) {
  const file = path.join(root, ".env.e2e");
  if (!existsSync(file)) {
    fail(".env.e2e not found. Copy .env.e2e.example to .env.e2e (it is gitignored).");
  }
  const e2e = parseEnv(readFileSync(file, "utf8"));

  for (const name of ["DATABASE_URL", "DIRECT_URL"]) {
    if (!isLocalE2eUrl(e2e[name])) {
      fail(`${name} in .env.e2e must point to the local e2e cluster (127.0.0.1:54329 or localhost:54329).`);
    }
  }
  const dbName = new URL(e2e.DATABASE_URL).pathname.replace(/^\//, "");
  if (dbName !== DB_NAME) {
    fail(`DATABASE_URL in .env.e2e must use the database "${DB_NAME}" (reset drops and recreates it).`);
  }

  const missing = new Set();
  for (const rel of INHERITABLE_ENV_FILES) {
    for (const key of envKeys(path.join(root, rel))) {
      if (!e2e[key]?.trim()) missing.add(`${key} (from ${rel})`);
    }
  }
  if (missing.size) {
    fail(
      `these keys are missing or empty in .env.e2e, so they would be inherited from production: ${[...missing].join(", ")}. ` +
        "Add them to .env.e2e with a test value."
    );
  }
  return e2e;
}

/** Guard 3: .env.e2e wins over the shell; returns the env every child gets. */
function applyE2eEnv() {
  const e2e = loadE2eEnv();
  Object.assign(process.env, e2e);
  // No update checks or telemetry calls from the tools while testing.
  process.env.CHECKPOINT_DISABLE ??= "1";
  process.env.PRISMA_HIDE_UPDATE_MESSAGE ??= "1";
  process.env.NEXT_TELEMETRY_DISABLED ??= "1";
  return childEnv();
}

function childEnv() {
  const env = { ...process.env };
  assertLocalEnv(env);
  return env;
}

function assertLocalEnv(env) {
  for (const name of ["DATABASE_URL", "DIRECT_URL"]) {
    if (!isLocalE2eUrl(env[name])) fail(`${name} is not the local e2e database; refusing to run anything.`);
  }
}

function assertSafePgData() {
  if (/scoop[\\/](apps|persist)[\\/]postgresql/i.test(PGDATA)) {
    fail(`refusing to use ${PGDATA}: that is scoop's own PostgreSQL data folder.`);
  }
}

// ---------------------------------------------------------------------------
// Processes
// ---------------------------------------------------------------------------

function pgExe(name) {
  const exe = path.join(PG_BIN, process.platform === "win32" ? `${name}.exe` : name);
  return existsSync(exe) ? exe : name;
}

/** Runs a command with the given env (checked first). Aborts on a non-zero exit unless allowFail. */
function run(label, command, args, { env, allowFail = false, stdio = "inherit" } = {}) {
  assertLocalEnv(env);
  log(`$ ${label}`);
  const result = spawnSync(command, args, { cwd: ROOT, env, stdio, windowsHide: true });
  if (result.error) fail(`${label}: ${result.error.message}`);
  if (result.status !== 0 && !allowFail) fail(`${label} exited with code ${result.status}`);
  return result;
}

const nodeTool = (cli, args) => [process.execPath, [cli, ...args]];

function psql(env, sql) {
  run(`psql: ${sql}`, pgExe("psql"), ["-h", "127.0.0.1", "-p", String(PG_PORT), "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-q", "-c", sql], {
    env,
  });
}

function pgIsReady(env) {
  const result = spawnSync(pgExe("pg_isready"), ["-h", "127.0.0.1", "-p", String(PG_PORT), "-U", "postgres", "-q"], {
    env,
    stdio: "ignore",
    windowsHide: true,
  });
  return result.status === 0;
}

function clusterRunning(env) {
  if (!existsSync(path.join(PGDATA, "PG_VERSION"))) return false;
  const result = spawnSync(pgExe("pg_ctl"), ["status", "-D", PGDATA], { env, stdio: "ignore", windowsHide: true });
  return result.status === 0;
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

function start(env) {
  assertSafePgData();
  if (!existsSync(path.join(PGDATA, "PG_VERSION"))) {
    if (existsSync(PGDATA) && readdirSync(PGDATA).length > 0) {
      fail(`${PGDATA} exists, is not empty and is not a PostgreSQL cluster.`);
    }
    run(`initdb ${PGDATA}`, pgExe("initdb"), ["-D", PGDATA, "-U", "postgres", "-A", "trust", "-E", "UTF8", "--no-locale"], {
      env,
    });
  }

  if (clusterRunning(env)) {
    if (pgIsReady(env)) {
      log(`cluster already running on 127.0.0.1:${PG_PORT}`);
      return;
    }
  } else if (pgIsReady(env)) {
    fail(`port ${PG_PORT} is answering but not from ${PGDATA}: another server is using it.`);
  }

  // stdio "ignore": postgres outlives pg_ctl and must not hold this process's pipes open.
  run(
    `pg_ctl start (127.0.0.1:${PG_PORT}, log ${PG_LOG})`,
    pgExe("pg_ctl"),
    ["start", "-D", PGDATA, "-l", PG_LOG, "-w", "-t", "60", "-o", `-p ${PG_PORT} -c listen_addresses=127.0.0.1`],
    { env, stdio: "ignore" }
  );
  if (!pgIsReady(env)) fail(`the cluster did not come up; see ${PG_LOG}`);
  log(`cluster up on 127.0.0.1:${PG_PORT} (data ${PGDATA})`);
}

function reset(env) {
  if (!pgIsReady(env)) fail(`no server on 127.0.0.1:${PG_PORT}; run "node scripts/e2e-db.mjs start" first.`);

  psql(env, `DROP DATABASE IF EXISTS ${DB_NAME} WITH (FORCE);`);
  psql(env, `CREATE DATABASE ${DB_NAME};`);

  run("prisma db push --skip-generate", ...nodeTool(PRISMA_CLI, ["db", "push", "--skip-generate"]), { env });
  for (const seed of [...SEEDS, FIXTURES]) {
    run(`tsx ${seed}`, ...nodeTool(TSX_CLI, [seed]), { env });
  }
  log(`database ${DB_NAME} ready`);
}

function build(env) {
  const distDir = env.ARCANA_DIST_DIR;
  if (!distDir || path.resolve(ROOT, distDir) === path.resolve(ROOT, ".next")) {
    fail("ARCANA_DIST_DIR must name its own folder (e.g. .next-e2e) so the e2e build never touches .next.");
  }
  if (env.ARCANA_E2E_SKIP_BUILD === "1" && existsSync(path.join(ROOT, distDir, "BUILD_ID"))) {
    log(`ARCANA_E2E_SKIP_BUILD=1: reusing ${distDir}`);
    return;
  }

  // next build adds "<distDir>/types/**/*.ts" to tsconfig.json; the e2e build must not leave that behind.
  const tsconfig = path.join(ROOT, "tsconfig.json");
  const tsconfigBefore = readFileSync(tsconfig, "utf8");
  try {
    run(`next build (distDir ${distDir})`, ...nodeTool(NEXT_CLI, ["build"]), { env: nextEnv(env) });
  } finally {
    if (readFileSync(tsconfig, "utf8") !== tsconfigBefore) {
      writeFileSync(tsconfig, tsconfigBefore);
      log("restored tsconfig.json (next build had added the e2e distDir to it)");
    }
  }
}

/** Next sets NODE_ENV itself for build/start. */
function nextEnv(env) {
  const copy = { ...env };
  delete copy.NODE_ENV;
  return copy;
}

function serve() {
  const env = applyE2eEnv();
  start(env);
  if (env.ARCANA_E2E_SKIP_RESET === "1") log("ARCANA_E2E_SKIP_RESET=1: keeping the current data");
  else reset(env);
  build(env);

  assertLocalEnv(env);
  log(`$ next start -p ${APP_PORT}`);
  const child = spawn(process.execPath, [NEXT_CLI, "start", "-p", String(APP_PORT)], {
    cwd: ROOT,
    env: nextEnv(env),
    stdio: "inherit",
    windowsHide: true,
  });
  const forward = (signal) => () => child.kill(signal);
  process.on("SIGINT", forward("SIGINT"));
  process.on("SIGTERM", forward("SIGTERM"));
  child.on("exit", (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
}

function stop() {
  if (!existsSync(path.join(PGDATA, "PG_VERSION"))) {
    log(`no cluster in ${PGDATA}`);
    return;
  }
  const env = { ...process.env };
  if (!clusterRunning(env)) {
    log("cluster already stopped");
    return;
  }
  const result = spawnSync(pgExe("pg_ctl"), ["stop", "-D", PGDATA, "-m", "fast", "-w", "-t", "60"], {
    stdio: "inherit",
    windowsHide: true,
  });
  if (result.status !== 0) fail("pg_ctl stop failed");
  log("cluster stopped");
}

function status() {
  const env = { ...process.env };
  const running = clusterRunning(env);
  log(`cluster ${PGDATA}: ${running ? "running" : "stopped"}; 127.0.0.1:${PG_PORT} ${pgIsReady(env) ? "answers" : "does not answer"}`);
}

function check(args) {
  const rootIndex = args.indexOf("--root");
  const root = rootIndex >= 0 ? path.resolve(args[rootIndex + 1] ?? "") : ROOT;
  const e2e = loadE2eEnv(root);
  log(`guards OK: DATABASE_URL and DIRECT_URL are local; ${Object.keys(e2e).length} keys in .env.e2e cover the inheritable env files`);
}

// ---------------------------------------------------------------------------

const [command, ...args] = process.argv.slice(2);

switch (command) {
  case "start":
    start(applyE2eEnv());
    break;
  case "reset":
    reset(applyE2eEnv());
    break;
  case "serve":
    serve();
    break;
  case "stop":
    stop();
    break;
  case "status":
    status();
    break;
  case "check":
    check(args);
    break;
  default:
    console.log("usage: node scripts/e2e-db.mjs <start|reset|serve|stop|status|check [--root <dir>]>");
    process.exit(command ? 1 : 0);
}
