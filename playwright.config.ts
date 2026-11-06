import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { defineConfig, devices } from "@playwright/test";

/**
 * e2e against a LOCAL database (PLAN 2026-11-05 §2.4, §5.2). Never production:
 * .env.e2e points to the cluster on 127.0.0.1:54329 and turns the AI into fixed
 * answers; scripts/e2e-db.mjs re-checks all of it before it builds or starts anything.
 */
const ENV_FILE = ".env.e2e";
if (!existsSync(ENV_FILE)) {
  throw new Error(`${ENV_FILE} not found: copy .env.e2e.example to ${ENV_FILE} (it is gitignored).`);
}
process.loadEnvFile(ENV_FILE);
// loadEnvFile never overrides what the shell already has: .env.e2e must win (a shell DATABASE_URL must not).
Object.assign(process.env, parseEnv(readFileSync(ENV_FILE, "utf8")));
for (const name of ["DATABASE_URL", "DIRECT_URL"]) {
  if (!/@(localhost|127\.0\.0\.1):54329\//.test(process.env[name] ?? "")) {
    throw new Error(`${name} in ${ENV_FILE} must point to the local e2e cluster (127.0.0.1:54329).`);
  }
}

const BASE_URL = `http://localhost:${process.env.ARCANA_E2E_WEB_PORT || "3000"}`;

/** Only the responsive pass runs at every width; flows and the older specs run at 1440. */
const RESPONSIVO = /responsivo\.spec\.ts$/;

const escritorio = (width: number, height: number) => ({
  ...devices["Desktop Chrome"],
  viewport: { width, height },
});
const tactil = (width: number, height: number) => ({
  ...devices["Desktop Chrome"],
  viewport: { width, height },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 2,
});

export default defineConfig({
  testDir: "./e2e",
  outputDir: "test-results",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 4,
  // Generous: on Windows each new database connection is a new Postgres process, which a
  // busy machine can take 10-20 s to start (see .env.e2e.example).
  timeout: 120_000,
  expect: { timeout: 20_000 },
  reporter: [["list"], ["html", { open: "never" }], ["json", { outputFile: "test-results/resultados.json" }]],
  // Logs in as the seeded e2e user before anything runs: proves :3000 is the e2e server.
  globalSetup: "./e2e/global-setup.ts",

  use: {
    baseURL: BASE_URL,
    locale: "es-MX",
    timezoneId: "America/Mexico_City",
    // next-pwa caches /api/* in its service worker; tests must always hit the server.
    serviceWorkers: "block",
    navigationTimeout: 60_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  // The English pass of responsivo.spec.ts (tag @en) runs at 390 only (§5.7).
  projects: [
    { name: "chromium-1440", use: escritorio(1440, 900), grepInvert: /@en/ },
    { name: "chromium-1024", use: escritorio(1024, 768), testMatch: RESPONSIVO, grepInvert: /@en/ },
    { name: "chromium-820", use: tactil(820, 1180), testMatch: RESPONSIVO, grepInvert: /@en/ },
    { name: "chromium-390", use: tactil(390, 844), testMatch: RESPONSIVO },
    { name: "chromium-360", use: tactil(360, 740), testMatch: RESPONSIVO, grepInvert: /@en/ },
    // Safari engine at phone width, public routes only (§5.2).
    {
      name: "webkit-390",
      use: { ...devices["iPhone 13"], viewport: { width: 390, height: 844 } },
      testMatch: RESPONSIVO,
      grep: /@publica/,
      grepInvert: /@en/,
    },
  ],

  // Starts the local cluster, resets and seeds arcana_e2e, builds into .next-e2e and runs
  // next start -p 3000, all with the .env.e2e env (see scripts/e2e-db.mjs). It does not reuse
  // a server already on :3000 (it could be a `next dev` wired to production's .env) unless
  // ARCANA_E2E_REUSE=1, for re-runs against a `serve` you started yourself; the global setup
  // still refuses any server that is not wired to the seeded e2e database.
  webServer: {
    command: "node scripts/e2e-db.mjs serve",
    url: `${BASE_URL}/api/health`,
    reuseExistingServer: process.env.ARCANA_E2E_REUSE === "1",
    timeout: 15 * 60_000,
    stdout: "pipe",
    stderr: "pipe",
    env: Object.fromEntries(Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined)),
  },
});
