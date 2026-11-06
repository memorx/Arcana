/**
 * @jest-environment node
 *
 * prisma/seed.ts wipe guard (PLAN 2026-11-05 §5.1). The seed deletes readings,
 * transactions, cards and spreads; the root .env is production. Nothing here
 * connects to a database: @prisma/client is mocked and the guard is pure.
 */

// jest.mock is hoisted above the imports, so the mock counts on globalThis.
const counters = globalThis as unknown as { __seedClients?: number; __seedTouches?: number };

jest.mock("@prisma/client", () => ({
  __esModule: true,
  PrismaClient: function PrismaClient() {
    const g = globalThis as unknown as { __seedClients?: number; __seedTouches?: number };
    g.__seedClients = (g.__seedClients ?? 0) + 1;
    return new Proxy(
      {},
      {
        get: () => {
          g.__seedTouches = (g.__seedTouches ?? 0) + 1;
          throw new Error("the guard test must never touch Prisma");
        },
      }
    );
  },
  Arcana: { MAJOR: "MAJOR", MINOR: "MINOR" },
  Suit: { WANDS: "WANDS", CUPS: "CUPS", SWORDS: "SWORDS", PENTACLES: "PENTACLES" },
  TransactionType: {},
}));

import { seedWipeRefusal } from "../../../prisma/seed";

const LOCAL = "postgresql://postgres@127.0.0.1:54329/arcana_e2e";
const SUPABASE_POOLER =
  "postgresql://postgres.abcdefghijkl:secret@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true";
const SUPABASE_DIRECT = "postgresql://postgres:secret@db.abcdefghijkl.supabase.co:5432/postgres";

describe("seedWipeRefusal", () => {
  it("importing the seed never runs it (main only runs when executed directly)", async () => {
    // The client is built (it connects lazily) but nothing ever touches it.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(counters.__seedClients).toBe(1);
    expect(counters.__seedTouches ?? 0).toBe(0);
  });

  it("accepts the local e2e database with the flag", () => {
    expect(seedWipeRefusal({ ARCANA_SEED_ALLOW_WIPE: "1", DATABASE_URL: LOCAL, DIRECT_URL: LOCAL })).toBeNull();
  });

  it("accepts localhost and a missing DIRECT_URL", () => {
    expect(
      seedWipeRefusal({ ARCANA_SEED_ALLOW_WIPE: "1", DATABASE_URL: "postgresql://postgres@localhost:54329/arcana_e2e" })
    ).toBeNull();
  });

  it.each([SUPABASE_POOLER, SUPABASE_DIRECT])("rejects Supabase even with the flag: %s", (url) => {
    const refusal = seedWipeRefusal({ ARCANA_SEED_ALLOW_WIPE: "1", DATABASE_URL: url, DIRECT_URL: url });
    expect(refusal).toMatch(/DATABASE_URL does not point to localhost/);
    // The message names the host, never the credentials.
    expect(refusal).not.toContain("secret");
  });

  it("rejects a local DATABASE_URL paired with a remote DIRECT_URL", () => {
    expect(
      seedWipeRefusal({ ARCANA_SEED_ALLOW_WIPE: "1", DATABASE_URL: LOCAL, DIRECT_URL: SUPABASE_DIRECT })
    ).toMatch(/DIRECT_URL does not point to localhost/);
  });

  it.each([undefined, "", "0", "true"])("rejects the local database without ARCANA_SEED_ALLOW_WIPE=1 (%p)", (flag) => {
    expect(seedWipeRefusal({ ARCANA_SEED_ALLOW_WIPE: flag, DATABASE_URL: LOCAL, DIRECT_URL: LOCAL })).toMatch(
      /ARCANA_SEED_ALLOW_WIPE=1 is not set/
    );
  });

  it.each([undefined, "", "not a url"])("rejects a missing or broken DATABASE_URL (%p)", (url) => {
    expect(seedWipeRefusal({ ARCANA_SEED_ALLOW_WIPE: "1", DATABASE_URL: url })).toMatch(/DATABASE_URL is missing/);
  });

  it("does not take a look-alike host for localhost", () => {
    expect(
      seedWipeRefusal({ ARCANA_SEED_ALLOW_WIPE: "1", DATABASE_URL: "postgresql://u@localhost.supabase.com:5432/db" })
    ).toMatch(/does not point to localhost/);
    expect(
      seedWipeRefusal({ ARCANA_SEED_ALLOW_WIPE: "1", DATABASE_URL: "postgresql://u@127.0.0.1.nip.io:5432/db" })
    ).toMatch(/does not point to localhost/);
  });
});
