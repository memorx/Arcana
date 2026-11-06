/**
 * @jest-environment node
 *
 * public/manifest.json: the install screenshots exist, measure what the manifest says (Chrome drops a screenshot whose
 * real size does not match `sizes`), follow Chrome's rules for the richer install UI, and are the two-ink design
 * (the old ones were purple, avg ≈ rgb(27, 17, 41)). Regenerate with `npm run generate:screenshots`.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

type Captura = { src: string; sizes: string; type: string; form_factor?: "wide" | "narrow"; label?: string };

const PUBLICO = path.join(process.cwd(), "public");
const manifest = JSON.parse(fs.readFileSync(path.join(PUBLICO, "manifest.json"), "utf8")) as {
  screenshots: Captura[];
  theme_color: string;
  background_color: string;
};

describe("manifest · install screenshots", () => {
  it("one wide and one narrow, each with a label", () => {
    expect(manifest.screenshots.map((c) => c.form_factor).sort()).toEqual(["narrow", "wide"]);
    manifest.screenshots.forEach((c) => expect(c.label?.length).toBeGreaterThan(10));
  });

  it.each(manifest.screenshots.map((c) => [c.src, c] as const))("%s exists and measures what the manifest says", async (_, c) => {
    const archivo = path.join(PUBLICO, c.src);
    expect(fs.existsSync(archivo)).toBe(true);
    const { width, height, format } = await sharp(archivo).metadata();
    expect(`${width}x${height}`).toBe(c.sizes);
    expect(`image/${format}`).toBe(c.type);
    // Chrome: each side 320–3840 px, the long side at most 2.3× the short one; wide is landscape, narrow portrait.
    for (const lado of [width!, height!]) {
      expect(lado).toBeGreaterThanOrEqual(320);
      expect(lado).toBeLessThanOrEqual(3840);
    }
    expect(Math.max(width!, height!) / Math.min(width!, height!)).toBeLessThanOrEqual(2.3);
    expect(c.form_factor === "wide" ? width! > height! : height! > width!).toBe(true);
    // Light enough to install quickly; they are not precached (next.config publicExcludes).
    expect(fs.statSync(archivo).size).toBeLessThan(250 * 1024);
  });

  it.each(manifest.screenshots.map((c) => [c.src] as const))("%s is in two inks, not the old purple", async (src) => {
    const { channels } = await sharp(path.join(PUBLICO, src)).stats();
    const [r, g, b] = channels.map((ch) => ch.mean);
    // Ink-black ground with pink: never bluer than it is red (purple had b ≫ r).
    expect(b).toBeLessThanOrEqual(r);
    expect(Math.abs(r - 27) + Math.abs(g - 17) + Math.abs(b - 41)).toBeGreaterThan(5);
  });

  it("no file left in public/screenshots that the manifest does not list", () => {
    const listadas = new Set(manifest.screenshots.map((c) => path.basename(c.src)));
    const presentes = fs.readdirSync(path.join(PUBLICO, "screenshots")).filter((f) => !f.startsWith("."));
    expect(presentes.sort()).toEqual([...listadas].sort());
  });
});
