/** @jest-environment node */
import fs from "node:fs";
import path from "node:path";
import { CARTAS, CARTA_REVERSO, cartaImagen, slugCarta, type VarianteCarta } from "@/lib/cartas";

const RAIZ = process.cwd();
const PUBLICO = path.join(RAIZ, "public");
const VARIANTES: VarianteCarta[] = ["color", "tinta", "mesa"];

/** Los nombres de las 78 cartas tal como están en prisma/seed.ts (name → nameEs → number). */
function cartasDelSeed(): string[] {
  const seed = fs.readFileSync(path.join(RAIZ, "prisma/seed.ts"), "utf8");
  return [...seed.matchAll(/name: "([^"]+)",\s*nameEs: "[^"]*",\s*number: \d+,/g)].map((m) => m[1]);
}

describe("cartas autohospedadas", () => {
  const seed = cartasDelSeed();

  it("el seed tiene 78 cartas y CARTAS las trae en el mismo orden", () => {
    expect(seed).toHaveLength(78);
    expect(CARTAS.map((c) => c.name)).toEqual(seed);
    expect(new Set(CARTAS.map((c) => c.slug)).size).toBe(78);
  });

  it.each(seed)("%s tiene slug y sus tres variantes en public/cartas", (nombre) => {
    const slug = slugCarta(nombre);
    expect(slug).toMatch(/^(rws-tarot-\d\d-[a-z-]+|(wands|cups|swords|pents)(0[1-9]|1[0-4]))$/);
    for (const v of VARIANTES) {
      const ruta = cartaImagen({ name: nombre }, v);
      expect(ruta).toBe(`/cartas/${slug}-${v}.webp`);
      expect(fs.existsSync(path.join(PUBLICO, ruta))).toBe(true);
    }
  });

  it("vectores del plan: The Lovers y Two of Cups", () => {
    expect(slugCarta("The Lovers")).toBe("rws-tarot-06-lovers");
    expect(slugCarta("Two of Cups")).toBe("cups02");
    expect(slugCarta("King of Pentacles")).toBe("pents14");
    expect(slugCarta("Page of Wands")).toBe("wands11");
    expect(cartaImagen("The Lovers")).toBe("/cartas/rws-tarot-06-lovers-color.webp");
    expect(cartaImagen({ name: "The Star" }, "tinta")).toBe("/cartas/rws-tarot-17-star-tinta.webp");
  });

  it("acepta slugs, mayúsculas, espacios y variantes de escritura", () => {
    expect(slugCarta("cups02")).toBe("cups02");
    expect(slugCarta("  the LOVERS ")).toBe("rws-tarot-06-lovers");
    expect(slugCarta("Judgment")).toBe("rws-tarot-20-judgement");
    expect(slugCarta("The Wheel of Fortune")).toBe("rws-tarot-10-wheel-of-fortune");
    expect(slugCarta("Ace of Coins")).toBe("pents01");
  });

  it("un nombre desconocido no tiene slug y su imagen es el reverso (que existe)", () => {
    expect(slugCarta("The Joker")).toBe("");
    expect(slugCarta("")).toBe("");
    expect(cartaImagen({ name: "The Joker" })).toBe(CARTA_REVERSO);
    expect(fs.existsSync(path.join(PUBLICO, CARTA_REVERSO))).toBe(true);
  });

  it("public/cartas pesa 14 MB o menos", () => {
    const dir = path.join(PUBLICO, "cartas");
    const bytes = fs.readdirSync(dir).reduce((s, f) => s + fs.statSync(path.join(dir, f)).size, 0);
    expect(bytes).toBeLessThanOrEqual(14 * 1024 * 1024);
  });

  it("no queda ningún archivo de más en public/cartas", () => {
    const esperados = new Set([...CARTAS.flatMap((c) => VARIANTES.map((v) => `${c.slug}-${v}.webp`)), "reverso.svg"]);
    expect(fs.readdirSync(path.join(PUBLICO, "cartas")).filter((f) => !esperados.has(f))).toEqual([]);
  });
});
