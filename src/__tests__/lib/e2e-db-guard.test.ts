/**
 * @jest-environment node
 *
 * Guards of scripts/e2e-db.mjs (PLAN 2026-11-05 §5.1). Runs the real script with
 * `check --root <tmp>`: it only reads the env files of that folder and never
 * starts, connects to or writes any database.
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const SCRIPT = path.join(process.cwd(), "scripts", "e2e-db.mjs");
const LOCAL = "postgresql://postgres@127.0.0.1:54329/arcana_e2e";
const PROD_SECRET = "prod-value-that-must-never-be-printed";
const PROD_DB = `postgresql://postgres.abcdefghijkl:${PROD_SECRET}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;

const PROD_ENV = [
  `DATABASE_URL=${PROD_DB}`,
  `DIRECT_URL=${PROD_DB}`,
  `NEXTAUTH_SECRET=${PROD_SECRET}`,
  `ANTHROPIC_API_KEY=${PROD_SECRET}`,
  `RESEND_API_KEY=${PROD_SECRET}`,
].join("\n");

const GOOD_E2E: Record<string, string> = {
  DATABASE_URL: LOCAL,
  DIRECT_URL: LOCAL,
  NEXTAUTH_SECRET: "e2e",
  ANTHROPIC_API_KEY: "sk-ant-e2e-invalid",
  RESEND_API_KEY: "re_e2e",
};

const dirs: string[] = [];

function check(files: Record<string, string>) {
  const root = mkdtempSync(path.join(os.tmpdir(), "arcana-e2e-guard-"));
  dirs.push(root);
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(path.join(root, name), content);
  }
  const result = spawnSync(process.execPath, [SCRIPT, "check", "--root", root], { encoding: "utf8" });
  const output = `${result.stdout}${result.stderr}`;
  return { code: result.status, output };
}

const e2eFile = (overrides: Record<string, string | undefined> = {}) =>
  Object.entries({ ...GOOD_E2E, ...overrides })
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

afterAll(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
});

describe("scripts/e2e-db.mjs guards", () => {
  it("accepts a local .env.e2e that covers every key of .env", () => {
    const { code, output } = check({ ".env": PROD_ENV, ".env.e2e": e2eFile() });
    expect(output).toMatch(/guards OK/);
    expect(code).toBe(0);
    expect(output).not.toContain(PROD_SECRET);
  });

  it("aborts when .env.e2e is missing", () => {
    const { code, output } = check({ ".env": PROD_ENV });
    expect(code).toBe(1);
    expect(output).toMatch(/\.env\.e2e not found/);
  });

  it.each([
    ["DATABASE_URL", PROD_DB],
    ["DIRECT_URL", PROD_DB],
    ["DATABASE_URL", "postgresql://postgres@127.0.0.1:5432/arcana_e2e"],
    ["DIRECT_URL", "postgresql://postgres@db.example.com:54329/arcana_e2e"],
    // The regex alone would match the query string; the parsed host must be local too.
    ["DATABASE_URL", "postgresql://u@db.abcdefghijkl.supabase.co:5432/postgres?x=@127.0.0.1:54329/"],
  ])("aborts when %s is not the local cluster (%s)", (name, url) => {
    const { code, output } = check({ ".env": PROD_ENV, ".env.e2e": e2eFile({ [name]: url }) });
    expect(code).toBe(1);
    expect(output).toContain(`${name} in .env.e2e must point to the local e2e cluster`);
    expect(output).not.toContain(PROD_SECRET);
  });

  it("aborts when the database is not arcana_e2e (reset drops it)", () => {
    const other = "postgresql://postgres@127.0.0.1:54329/postgres";
    const { code, output } = check({ ".env": PROD_ENV, ".env.e2e": e2eFile({ DATABASE_URL: other }) });
    expect(code).toBe(1);
    expect(output).toMatch(/must use the database "arcana_e2e"/);
  });

  it("aborts when a key of .env is missing in .env.e2e, naming it without its value", () => {
    const { code, output } = check({ ".env": PROD_ENV, ".env.e2e": e2eFile({ RESEND_API_KEY: undefined }) });
    expect(code).toBe(1);
    expect(output).toContain("RESEND_API_KEY (from .env)");
    expect(output).not.toContain(PROD_SECRET);
  });

  it("aborts when a key of .env is empty in .env.e2e (an empty value could fall back to production)", () => {
    const { code, output } = check({ ".env": PROD_ENV, ".env.e2e": e2eFile({ ANTHROPIC_API_KEY: "" }) });
    expect(code).toBe(1);
    expect(output).toContain("ANTHROPIC_API_KEY (from .env)");
  });

  it("also checks .env.production.local and .env.local", () => {
    const { code, output } = check({
      ".env": PROD_ENV,
      ".env.production.local": `STRIPE_SECRET_KEY=${PROD_SECRET}`,
      ".env.local": `CRON_SECRET=${PROD_SECRET}`,
      ".env.e2e": e2eFile(),
    });
    expect(code).toBe(1);
    expect(output).toContain("STRIPE_SECRET_KEY (from .env.production.local)");
    expect(output).toContain("CRON_SECRET (from .env.local)");
    expect(output).not.toContain(PROD_SECRET);
  });

  it("keys that only exist in .env.e2e are fine", () => {
    const { code } = check({ ".env": PROD_ENV, ".env.e2e": `${e2eFile()}\nARCANA_AI_FAKE=1\nGOOGLE_CLIENT_ID=` });
    expect(code).toBe(0);
  });

  it("the committed .env.e2e.example passes the guards against the production key names", () => {
    const example = readFileSync(path.join(process.cwd(), ".env.e2e.example"), "utf8");
    const prodKeys = [
      "DATABASE_URL",
      "DIRECT_URL",
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "NEXTAUTH_SECRET",
      "NEXTAUTH_URL",
      "ANTHROPIC_API_KEY",
      "STRIPE_SECRET_KEY",
      "STRIPE_WEBHOOK_SECRET",
      "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
      "RESEND_API_KEY",
      "CRON_SECRET",
    ];
    const { code, output } = check({
      ".env": prodKeys.map((key) => `${key}=${PROD_SECRET}`).join("\n"),
      ".env.e2e": example,
    });
    expect(output).toMatch(/guards OK/);
    expect(code).toBe(0);
    expect(example).toMatch(/^ARCANA_AI_FAKE=1$/m);
    expect(example).toMatch(/^ARCANA_SEED_ALLOW_WIPE=1$/m);
    expect(example).toMatch(/^ANTHROPIC_API_KEY=sk-ant-e2e-invalid$/m);
    expect(example).toMatch(/^ARCANA_DIST_DIR=\.next-e2e$/m);
    expect(example).not.toMatch(/supabase\.(co|com)/);
  });
});
