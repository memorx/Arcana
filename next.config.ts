import path from "node:path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import withPWAInit from "next-pwa";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  // next-pwa precaches all of public/ by default. The 234 card images (~10 MB) and the
  // install screenshots must not download in the background on a first visit: they are
  // cached at runtime when a page shows them (the "cartas" rule below).
  publicExcludes: ["!noprecache/**/*", "!cartas/**/*", "!screenshots/**/*"],
  runtimeCaching: [
    // Card images are self-hosted under /cartas/* (served from public/; the old Wikimedia
    // rule is gone). File names carry no hash, hence the expiration.
    {
      urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith("/cartas/"),
      handler: "CacheFirst",
      options: {
        cacheName: "cartas",
        expiration: {
          maxEntries: 300,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
        },
      },
    },
    {
      urlPattern: /^https:\/\/www\.readarcana\.com\/api\/.*/i,
      handler: "NetworkFirst",
      options: {
        cacheName: "api-cache",
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 5, // 5 minutes
        },
      },
    },
  ],
});

const nextConfig: NextConfig = {
  // Pin the tracing root to this project so Next doesn't pick up a lockfile
  // from a parent folder (silences the "multiple lockfiles" warning).
  outputFileTracingRoot: path.join(process.cwd()),

  // Local e2e builds into their own folder (ARCANA_DIST_DIR=.next-e2e in .env.e2e)
  // so they never clobber the `.next` of `next dev`.
  distDir: process.env.ARCANA_DIST_DIR || ".next",

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        // Card images (public/cartas): Vercel serves public/ with max-age=0, so the portada's 40
        // engravings were revalidated on every visit. 30 days fresh + 7 of stale-while-revalidate;
        // not `immutable`, because the file names carry no hash.
        source: "/cartas/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=2592000, stale-while-revalidate=604800" }],
      },
    ];
  },
};

export default withPWA(withNextIntl(nextConfig));
