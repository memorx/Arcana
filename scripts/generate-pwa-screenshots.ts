/**
 * Install screenshots of the PWA (public/manifest.json → "screenshots"), taken from a running build of the app.
 *
 *   node scripts/e2e-db.mjs serve                      # local build on its own database (never production)
 *   ARCANA_SCREENSHOTS_URL=http://localhost:3011 npm run generate:screenshots
 *
 * The portada as a guest, in Spanish, with reduced motion (the engraving table stays still):
 * - wide:   1440 × 900 (desktop install dialog)
 * - narrow: 390 × 844 at 2x = 780 × 1688 (Android install sheet)
 * Saved as WebP. The sizes here must match the manifest entries (src/__tests__/lib/pwa-manifest.test.ts reads the files and checks them).
 */
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const BASE_URL = process.env.ARCANA_SCREENSHOTS_URL || "http://localhost:3000";
const OUTPUT_DIR = path.join(process.cwd(), "public", "screenshots");

const CAPTURAS = [
  { file: "portada-ancha.webp", width: 1440, height: 900, scale: 1, mobile: false },
  { file: "portada-angosta.webp", width: 390, height: 844, scale: 2, mobile: true },
] as const;

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  try {
    for (const c of CAPTURAS) {
      const context = await browser.newContext({
        viewport: { width: c.width, height: c.height },
        deviceScaleFactor: c.scale,
        isMobile: c.mobile,
        hasTouch: c.mobile,
        locale: "es-MX",
        timezoneId: "America/Mexico_City",
        reducedMotion: "reduce",
        serviceWorkers: "block",
      });
      const page = await context.newPage();
      await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      // The whole engraving table of the first screen, loaded (its lazy ones may not have been requested yet).
      await page.evaluate(() =>
        document.querySelectorAll<HTMLImageElement>(".portada-grabados img").forEach((img) => (img.loading = "eager"))
      );
      await page.waitForFunction(() =>
        Array.from(document.querySelectorAll<HTMLImageElement>(".portada-grabados img")).every(
          (img) => img.complete && img.naturalWidth > 0
        )
      );
      await page.waitForTimeout(500);
      const png = await page.screenshot({ type: "png" });
      const salida = path.join(OUTPUT_DIR, c.file);
      await sharp(png).webp({ quality: 82, effort: 6 }).toFile(salida);
      const { width, height } = await sharp(salida).metadata();
      console.log(`${c.file}: ${width}×${height}, ${Math.round(fs.statSync(salida).size / 1024)} KB`);
      await context.close();
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
