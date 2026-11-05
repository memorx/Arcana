/**
 * @jest-environment node
 */
// Real messages, so the test sees the titles that ship.
import mockEs from "../../../messages/es.json";
import mockEn from "../../../messages/en.json";

let mockLocale: "es" | "en" = "es";

jest.mock("next-intl/server", () => ({
  getTranslations: async (namespace: string) => (key: string) =>
    key.split(".").reduce<unknown>(
      (node, part) => (node as Record<string, unknown>)[part],
      (mockLocale === "es" ? mockEs : mockEn)[namespace as keyof typeof mockEs]
    ),
}));

import { generateMetadata } from "@/app/(main)/calendar/layout";

describe("/calendar metadata", () => {
  it.each([
    ["es", "Calendario Arcano: tonalli, luna y día personal"],
    ["en", "Arcana Calendar: tonalli, moon and personal day"],
  ] as const)("in %s the title has no brand suffix (the root template adds it)", async (locale, title) => {
    mockLocale = locale;

    const metadata = await generateMetadata();

    expect(metadata.title).toBe(title);
    // The root layout's template is "%s | Arcana": the final title has the brand once
    expect(`${metadata.title} | Arcana`.match(/\| Arcana/g)).toHaveLength(1);
    expect(metadata.description).toEqual(expect.any(String));
    expect(metadata.alternates).toEqual({ canonical: "/calendar" });
  });
});
