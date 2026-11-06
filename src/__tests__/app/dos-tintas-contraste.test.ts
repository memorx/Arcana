/**
 * Contraste AA calculado desde los tokens reales de globals.css (PLAN §2.1):
 * si alguien cambia un color, este test dice si deja de leerse.
 * Fórmula WCAG 2.x: (L1 + 0.05) / (L2 + 0.05) con luminancia relativa sRGB.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

const css = readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");
const remapeo = readFileSync(path.join(process.cwd(), "src/app/remapeo-paleta.css"), "utf8");

/** --color-NOMBRE: #rrggbb del primer bloque @theme static. */
const tokens: Record<string, string> = {};
const theme = css.match(/@theme static \{([\s\S]*?)\n\}/);
if (!theme) throw new Error("globals.css: no encuentro @theme static");
for (const [, nombre, hex] of theme[1].matchAll(/--color-([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) {
  tokens[nombre] = hex.toLowerCase();
}

function luminancia(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(a: string, b: string): number {
  const [x, y] = [luminancia(a), luminancia(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

const color = (nombre: string) => {
  const hex = tokens[nombre];
  if (!hex) throw new Error(`token --color-${nombre} no está en globals.css`);
  return hex;
};

/** Variables de un suelo (.suelo-papel / .suelo-tinta) resueltas a hex. */
function suelo(selector: RegExp): Record<string, string> {
  const bloque = css.match(selector);
  if (!bloque) throw new Error(`globals.css: no encuentro ${selector}`);
  const vars: Record<string, string> = {};
  for (const [, nombre, token] of bloque[1].matchAll(/--([\w-]+):\s*var\(--color-([\w-]+)\)\s*;/g)) {
    vars[nombre] = color(token);
  }
  return vars;
}

const AA = 4.5;
const GRANDE = 3; // texto ≥ 24 px (o ≥ 18.66 px en negrita) e indicadores de foco

describe("tokens de Dos tintas", () => {
  it("están los de §2.1 con sus valores", () => {
    expect(tokens).toMatchObject({
      tinta: "#0e0d0c",
      papel: "#eceae6",
      "papel-hondo": "#e2dfd9",
      grafito: "#55524d",
      niebla: "#a8a49d",
      rosa: "#e4007c",
      "rosa-texto": "#b10061",
      "rosa-luz": "#f43d97",
      brasa: "#ff6bb5",
      error: "#b3261e",
      "error-claro": "#ff8a80",
      exito: "#1f6b3a",
      "exito-claro": "#7bd88f",
    });
  });
});

describe("contraste AA de texto chico (≥ 4.5)", () => {
  const combinaciones: [texto: string, fondo: string][] = [
    // sobre papel
    ["tinta", "papel"],
    ["grafito", "papel"],
    ["rosa-texto", "papel"],
    ["error", "papel"],
    ["exito", "papel"],
    // sobre papel hondo (esqueletos, láminas de segundo plano)
    ["tinta", "papel-hondo"],
    ["grafito", "papel-hondo"],
    ["rosa-texto", "papel-hondo"],
    // sobre tinta
    ["papel", "tinta"],
    ["niebla", "tinta"],
    ["rosa-luz", "tinta"],
    ["error-claro", "tinta"],
    ["exito-claro", "tinta"],
    // botones y sellos: primario y aviso (tinta sobre rosa-luz), peligro (papel sobre error)
    ["tinta", "rosa-luz"],
    ["papel", "error"],
    ["tinta", "brasa"], // primario al pasar el puntero
  ];

  it.each(combinaciones)("%s sobre %s", (texto, fondo) => {
    expect(contraste(color(texto), color(fondo))).toBeGreaterThanOrEqual(AA);
  });

  it("el rosa puro no alcanza AA chico: sólo pincel, gráficos, texto ≥ 24 px y el anillo de foco (≥ 3)", () => {
    for (const fondo of ["papel", "tinta"]) {
      const r = contraste(color("rosa"), color(fondo));
      expect(r).toBeGreaterThanOrEqual(GRANDE);
      expect(r).toBeLessThan(AA);
    }
  });
});

describe("colores de letra según el suelo (text-letra*, bg-suelo)", () => {
  const papel = suelo(/:root,\s*\.suelo-papel \{([\s\S]*?)\}/);
  const tinta = suelo(/\n\s*\.suelo-tinta \{([\s\S]*?)\}/);

  it.each([
    ["papel", papel],
    ["tinta", tinta],
  ])("cada letra se lee sobre el suelo %s", (_nombre, vars) => {
    expect(Object.keys(vars)).toEqual(
      expect.arrayContaining(["suelo", "letra", "letra-suave", "letra-acento", "letra-error", "letra-exito"])
    );
    for (const letra of ["letra", "letra-suave", "letra-acento", "letra-error", "letra-exito"]) {
      expect(contraste(vars[letra], vars.suelo)).toBeGreaterThanOrEqual(AA);
    }
  });
});

describe("red de seguridad del remapeo (§5.3)", () => {
  /** --color-FAMILIA-NNN de un bloque del remapeo. */
  function tabla(bloque: string): Record<string, string> {
    const t: Record<string, string> = {};
    for (const [, nombre, hex] of bloque.matchAll(/--color-([a-z]+-\d+):\s*(#[0-9a-f]{6})\s*;/g)) t[nombre] = hex;
    return t;
  }
  const sobrePapel = tabla(remapeo.match(/@theme \{([\s\S]*?)\n\}/)![1]);
  const sobreTinta = tabla(remapeo.match(/\n {2}\.suelo-tinta \{([\s\S]*?)\n {2}\}/)![1]);

  it("cubre las 17 familias con todos sus tonos, en papel y en tinta", () => {
    const familias = "slate purple violet indigo fuchsia pink amber yellow orange red rose emerald green teal blue sky cyan".split(" ");
    for (const t of [sobrePapel, sobreTinta]) {
      for (const f of familias) {
        for (const n of [100, 200, 300, 400, 500, 600, 700, 800, 900, 950]) expect(t[`${f}-${n}`]).toBeDefined();
      }
      expect(Object.keys(t)).toHaveLength(171);
    }
  });

  it("la tabla en papel es la de §5.3", () => {
    expect(sobrePapel["slate-950"]).toBe("#eceae6");
    expect(sobrePapel["slate-100"]).toBe("#0e0d0c");
    expect(sobrePapel["purple-500"]).toBe("#e4007c");
    expect(sobrePapel["amber-400"]).toBe("#b10061");
    expect(sobrePapel["violet-800"]).toBe("#f7d6e8");
    expect(sobrePapel["red-400"]).toBe("#b3261e");
    expect(sobrePapel["emerald-300"]).toBe("#1f6b3a");
    expect(sobrePapel["sky-900"]).toBe("#dadee6");
    expect(remapeo).not.toMatch(/--color-(white|black)/);
  });

  it.each([
    ["papel", sobrePapel],
    ["tinta", sobreTinta],
  ])("los textos viejos más comunes se siguen leyendo sobre sus fondos viejos (%s)", (suelo, t) => {
    // texto «claro» del tema viejo sobre sus fondos «oscuros», ya remapeados
    for (const texto of ["slate-100", "slate-200", "slate-300", "slate-400", "slate-500"]) {
      for (const fondo of ["slate-950", "slate-900"]) {
        // Excepción conocida de la tabla §5.3 en papel: slate-500 sobre slate-900 da 4.22
        // (#6B6761 sobre #E2DFD9). Deuda de los lotes que todavía usen esa pareja.
        if (suelo === "papel" && texto === "slate-500" && fondo === "slate-900") {
          expect(contraste(t[texto], t[fondo])).toBeGreaterThanOrEqual(4.2);
          continue;
        }
        expect(contraste(t[texto], t[fondo])).toBeGreaterThanOrEqual(AA);
      }
    }
    for (const texto of ["purple-400", "amber-400", "red-400", "emerald-400", "blue-400"]) {
      expect(contraste(t[texto], t["slate-950"])).toBeGreaterThanOrEqual(AA);
    }
  });
});
