/**
 * Contraste AA calculado desde los tokens reales de globals.css (PLAN §2.1):
 * si alguien cambia un color, este test dice si deja de leerse.
 * Fórmula WCAG 2.x: (L1 + 0.05) / (L2 + 0.05) con luminancia relativa sRGB.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const css = readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");

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


/**
 * Gate de la Fase 3 (§5.3). Mientras duró el rediseño, remapeo-paleta.css traducía la paleta vieja de
 * Tailwind a Dos tintas para que nada quedara ilegible; aquí se probaba esa red. Con todas las pantallas
 * reescritas la red se quitó, así que la garantía cambia de «lo viejo se lee» a «no queda nada viejo»:
 * una clase de esas familias ya no tendría remapeo y saldría morada, ámbar o azul de verdad.
 */
describe("sin paleta vieja (gate de la Fase 3, §5.3)", () => {
  const raiz = path.join(process.cwd(), "src");
  const archivos: string[] = [];
  (function recorrer(dir: string) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) recorrer(p);
      else if (/\.(tsx?|css)$/.test(e.name)) archivos.push(p);
    }
  })(raiz);
  const relativo = (p: string) => path.relative(process.cwd(), p).split(path.sep).join("/");
  const esPrueba = (p: string) => relativo(p).startsWith("src/__tests__/");

  const PREFIJOS =
    "bg|text|border|from|via|to|ring|ring-offset|fill|stroke|shadow|outline|divide|placeholder|decoration|accent|caret";
  const FAMILIAS =
    "slate|purple|violet|indigo|fuchsia|pink|amber|yellow|orange|red|rose|emerald|green|teal|blue|sky|cyan|lime|gray|zinc|neutral|stone";
  const CLASE_VIEJA = new RegExp(String.raw`(?<![\w-])(?:${PREFIJOS})-(?:${FAMILIAS})-[0-9]{2,3}\b`);

  function coincidencias(re: RegExp, filtro: (p: string) => boolean): string[] {
    return archivos.filter(filtro).flatMap((p) =>
      readFileSync(p, "utf8")
        .split(/\r?\n/)
        .flatMap((linea, i) => (re.test(linea) ? [`${relativo(p)}:${i + 1}`] : []))
    );
  }

  it("el remapeo ya no existe ni se importa", () => {
    expect(existsSync(path.join(raiz, "app/remapeo-paleta.css"))).toBe(false);
    expect(css).not.toMatch(/remapeo-paleta/);
    expect(css).not.toMatch(new RegExp(`--color-(?:${FAMILIAS})-[0-9]`));
  });

  it("ninguna clase de las familias viejas en src/ (incluidas las pruebas)", () => {
    expect(coincidencias(CLASE_VIEJA, () => true)).toEqual([]);
  });

  it("sin letra blanca de Tailwind ni clases prose en el código de la app", () => {
    expect(coincidencias(/(?<![\w-])text-(?:white)\b/, (p) => !esPrueba(p))).toEqual([]);
    const prose = /(?<![\w-])prose(?:-[a-z0-9]+)*(?![\w-])/;
    expect(coincidencias(prose, (p) => !esPrueba(p) && /\.(tsx|css)$/.test(p))).toEqual([]);
  });

  it("la interfaz pide las cartas a cartaImagen(), nunca a imageUrl", () => {
    const ui = (p: string) => {
      const r = relativo(p);
      return (r.startsWith("src/app/") && !r.startsWith("src/app/api/")) || r.startsWith("src/components/");
    };
    expect(coincidencias(/\bimageUrl\b/, ui)).toEqual([]);
  });

  it("recorre el árbol completo (no pasa en vacío)", () => {
    expect(archivos.length).toBeGreaterThan(200);
    expect(archivos.map(relativo)).toEqual(expect.arrayContaining(["src/app/globals.css", "src/app/page.tsx"]));
    // La regex sí reconoce una clase vieja (si no, el gate pasaría siempre).
    expect(CLASE_VIEJA.test(`className="md:${"bg"}-purple-900/20"`)).toBe(true);
    expect(CLASE_VIEJA.test(`className="bg-papel-hondo"`)).toBe(false);
  });
});
