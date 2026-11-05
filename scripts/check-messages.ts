/**
 * Fails (exit 1) when a messages file does not parse or when en/es do not
 * have exactly the same keys. Runs as `pretest`, so `npm test` stops early.
 *
 *   npx tsx scripts/check-messages.ts
 */
import { readFileSync } from "node:fs";
import path from "node:path";

const LOCALES = ["en", "es"] as const;
const dir = path.join(process.cwd(), "messages");

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

function leafKeys(value: Json, prefix = "", out: string[] = []): string[] {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value)) {
      leafKeys(child, prefix ? `${prefix}.${key}` : key, out);
    }
  } else {
    out.push(prefix);
  }
  return out;
}

const problems: string[] = [];
const keys = new Map<string, Set<string>>();

for (const locale of LOCALES) {
  const file = path.join(dir, `${locale}.json`);
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8")) as Json;
    keys.set(locale, new Set(leafKeys(parsed)));
  } catch (error) {
    problems.push(`messages/${locale}.json does not parse: ${(error as Error).message}`);
  }
}

if (keys.size === LOCALES.length) {
  for (const locale of LOCALES) {
    const mine = keys.get(locale)!;
    for (const other of LOCALES) {
      if (other === locale) continue;
      const theirs = keys.get(other)!;
      const missing = [...mine].filter((key) => !theirs.has(key));
      if (missing.length > 0) {
        problems.push(
          `${missing.length} key(s) in ${locale}.json missing from ${other}.json:\n  ${missing.join("\n  ")}`
        );
      }
    }
  }
}

if (problems.length > 0) {
  console.error(`check-messages: FAILED\n${problems.join("\n")}`);
  process.exit(1);
}

console.log(`check-messages: ok (${keys.get("en")!.size} keys in en and es)`);
