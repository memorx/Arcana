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
  // Card images are self-hosted under /cartas/* (served from public/), so the
  // old Wikimedia CacheFirst rule is gone.
  runtimeCaching: [
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
    ];
  },
};

export default withPWA(withNextIntl(nextConfig));
