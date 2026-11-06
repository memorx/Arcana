/**
 * @jest-environment node
 *
 * next.config.ts: what the service worker precaches and how it caches the self-hosted cards.
 * next-pwa is replaced by a spy that keeps its options (the real one only acts inside the webpack build).
 */
let mockOpcionesPwa: Record<string, unknown> = {};
jest.mock("next-pwa", () =>
  jest.fn((opciones: Record<string, unknown>) => {
    mockOpcionesPwa = opciones;
    return (config: unknown) => config;
  })
);
jest.mock("next-intl/plugin", () => () => (config: unknown) => config);

import type { NextConfig } from "next";

let nextConfig: NextConfig;
beforeAll(async () => {
  nextConfig = (await import("../../../next.config")).default;
});

type Regla = {
  urlPattern: RegExp | string | ((c: { url: URL; request?: Request; sameOrigin: boolean }) => boolean);
  handler: string;
  options?: { cacheName?: string; expiration?: { maxEntries?: number; maxAgeSeconds?: number } };
};

describe("next.config · service worker (next-pwa)", () => {
  it("does not precache the cards or the install screenshots, and keeps the default exclusion", () => {
    expect(mockOpcionesPwa.publicExcludes).toEqual(["!noprecache/**/*", "!cartas/**/*", "!screenshots/**/*"]);
  });

  it("caches same-origin /cartas/ at runtime: CacheFirst, 300 entries, 30 days", () => {
    const reglas = mockOpcionesPwa.runtimeCaching as Regla[];
    const cartas = reglas.find((r) => r.options?.cacheName === "cartas");
    expect(cartas).toBeDefined();
    expect(cartas!.handler).toBe("CacheFirst");
    expect(cartas!.options!.expiration).toEqual({ maxEntries: 300, maxAgeSeconds: 30 * 24 * 60 * 60 });

    const casa = cartas!.urlPattern as (c: { url: URL; sameOrigin: boolean }) => boolean;
    expect(typeof casa).toBe("function");
    const prueba = (href: string, sameOrigin: boolean) => casa({ url: new URL(href), sameOrigin });
    expect(prueba("https://www.readarcana.com/cartas/rws-tarot-00-fool-mesa.webp", true)).toBe(true);
    expect(prueba("https://www.readarcana.com/cartas/reverso.svg", true)).toBe(true);
    expect(prueba("https://otro.example/cartas/x.webp", false)).toBe(false);
    expect(prueba("https://www.readarcana.com/_next/image?url=%2Fcartas%2Fx.webp&w=384", true)).toBe(false);
    expect(prueba("https://www.readarcana.com/api/cartas/", true)).toBe(false);
  });

  it("the cards rule is self-contained (it is serialized into sw.js)", () => {
    const cartas = (mockOpcionesPwa.runtimeCaching as Regla[]).find((r) => r.options?.cacheName === "cartas")!;
    const fuente = String(cartas.urlPattern);
    // Only its own parameters: no imports or outer constants that would not exist inside the worker.
    expect(fuente).toMatch(/sameOrigin/);
    expect(fuente).toMatch(/\/cartas\//);
    expect(fuente).not.toMatch(/require\(|import\(|__webpack|_interop/);
  });

  it("no rule left for the old Wikimedia cache", () => {
    const reglas = mockOpcionesPwa.runtimeCaching as Regla[];
    expect(reglas.some((r) => r.options?.cacheName === "tarot-images")).toBe(false);
    expect(reglas.some((r) => String(r.urlPattern).includes("wikimedia"))).toBe(false);
  });

  it("keeps the rest of the config (distDir, security headers)", async () => {
    expect(nextConfig.distDir).toBe(process.env.ARCANA_DIST_DIR || ".next");
    const reglas = await nextConfig.headers!();
    expect(reglas.find((r) => r.source === "/:path*")?.headers.map((h) => h.key)).toContain("X-Content-Type-Options");
  });
});
