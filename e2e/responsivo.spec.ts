/**
 * Responsive safety net (PLAN 2026-11-05 §2.4, §5.2, §5.7). EVERY page of
 * src/app/**\/page.tsx (plus the 404), public and signed-in, at the five widths of the
 * projects in playwright.config.ts (1440, 1024, 820, 390, 360):
 *
 * - maqueta: expected status, no horizontal scroll, nothing off screen (a scroller
 *   excuses it; a box with overflow hidden/clip only excuses decoration or opts in with
 *   data-recorta: see medirMaqueta in helpers/responsivo.ts), every rendered image
 *   loaded, no console errors.
 * - encabezados: exactly one h1 and every visible heading exposed in the accessibility tree.
 * - movimiento reducido: with prefers-reduced-motion nothing keeps animating and nothing
 *   with .revelar / [data-revelar] stays faded.
 * - sin JS (public pages): the content is there and visible without JavaScript.
 * - en inglés (390 only, tag @en): maqueta and encabezados with an English browser.
 *
 * Signed-in pages run as the e2e users (e2e/fixtures/usuarios.ts): "historia" for the
 * lived-in states and "nuevo" for the empty ones. Phase 2 lots run this file to verify
 * their screens; a real defect of today's UI is listed in DEFECTOS and its check is
 * marked test.fixme with the reason, so the net stays green and the debt stays visible.
 */
import type { TestInfo } from "@playwright/test";
import { BLOG_SLUG, CARTA_SLUG, IDS, LECTURA_PRINCIPAL } from "./fixtures/usuarios";
import { idDeTirada } from "./helpers/entorno";
import {
  animacionesCorriendo,
  cargar,
  medirMaqueta,
  recorrer,
  revelarSinMostrar,
  textoInvisible,
  vigilarConsola,
} from "./helpers/responsivo";
import { expect, test, type Cuenta } from "./helpers/sesion";

type Chequeo = "maqueta" | "encabezados" | "reducido" | "sinjs";

interface Defecto {
  motivo: string;
  /** Only at these widths (default: all). */
  anchos?: number[];
  /** Only in this language (default: both). */
  idioma?: "es" | "en";
  /** Only in this engine (default: both). */
  motor?: "chromium" | "webkit";
}

interface Ruta {
  /** Unique label used in the test titles. */
  nombre: string;
  /** Path, resolved when the test runs (some ids come from the last seed). */
  ruta: () => string;
  cuenta: Cuenta | null;
  /** Expected final status (default 200). */
  status?: number;
  defectos?: Defectos;
}

interface Defectos extends Partial<Record<Chequeo, Defecto[]>> {
  /**
   * Known console errors: ignored (and annotated) instead of fixme'ing the whole
   * "maqueta" check, so the layout of that page stays watched.
   */
  consola?: { patron: RegExp; motivo: string }[];
}

const RUTAS: Ruta[] = [
  // ---- public ---------------------------------------------------------------
  { nombre: "portada /", ruta: () => "/", cuenta: null },
  { nombre: "/login", ruta: () => "/login", cuenta: null },
  { nombre: "/register", ruta: () => "/register", cuenta: null },
  { nombre: "/forgot-password", ruta: () => "/forgot-password", cuenta: null },
  { nombre: "/reset-password (sin token)", ruta: () => "/reset-password", cuenta: null },
  { nombre: "/about", ruta: () => "/about", cuenta: null },
  { nombre: "/privacy", ruta: () => "/privacy", cuenta: null },
  { nombre: "/terms", ruta: () => "/terms", cuenta: null },
  { nombre: "/blog", ruta: () => "/blog", cuenta: null },
  { nombre: "/blog/[slug]", ruta: () => `/blog/${BLOG_SLUG}`, cuenta: null },
  { nombre: "/cards", ruta: () => "/cards", cuenta: null },
  { nombre: "/cards/[slug]", ruta: () => `/cards/${CARTA_SLUG}`, cuenta: null },
  { nombre: "/calendar", ruta: () => "/calendar", cuenta: null },
  { nombre: "/share/[shareId]", ruta: () => `/share/${IDS.compartida(LECTURA_PRINCIPAL)}`, cuenta: null },
  { nombre: "/share/blueprint/[shareId]", ruta: () => `/share/blueprint/${IDS.mapaCompartido}`, cuenta: null },
  { nombre: "404", ruta: () => "/esta-carta-no-existe", cuenta: null, status: 404 },

  // ---- signed in: the lived-in account --------------------------------------
  { nombre: "/dashboard", ruta: () => "/dashboard", cuenta: "historia" },
  { nombre: "/reading/new", ruta: () => "/reading/new", cuenta: "historia" },
  {
    nombre: "/reading/new/[spreadTypeId]",
    ruta: () => `/reading/new/${idDeTirada("Three Card Spread")}`,
    cuenta: "historia",
  },
  { nombre: "/reading/manual", ruta: () => "/reading/manual", cuenta: "historia" },
  { nombre: "/reading/[id]", ruta: () => `/reading/${IDS.lectura(LECTURA_PRINCIPAL)}`, cuenta: "historia" },
  { nombre: "/history", ruta: () => "/history", cuenta: "historia" },
  { nombre: "/history/insights", ruta: () => "/history/insights", cuenta: "historia" },
  { nombre: "/daily", ruta: () => "/daily", cuenta: "historia" },
  { nombre: "/calendar (con sesión)", ruta: () => "/calendar", cuenta: "historia" },
  { nombre: "/blueprint", ruta: () => "/blueprint", cuenta: "historia" },
  { nombre: "/compatibility", ruta: () => "/compatibility", cuenta: "historia" },
  { nombre: "/compatibility/[id]", ruta: () => `/compatibility/${IDS.compatibilidad(1)}`, cuenta: "historia" },
  { nombre: "/profile/setup", ruta: () => "/profile/setup", cuenta: "historia" },
  { nombre: "/collection", ruta: () => "/collection", cuenta: "historia" },
  { nombre: "/achievements", ruta: () => "/achievements", cuenta: "historia" },
  { nombre: "/challenges", ruta: () => "/challenges", cuenta: "historia" },
  { nombre: "/credits", ruta: () => "/credits", cuenta: "historia" },
  { nombre: "/credits/success (sin session_id)", ruta: () => "/credits/success", cuenta: "historia" },
  { nombre: "/subscribe", ruta: () => "/subscribe", cuenta: "historia" },
  { nombre: "/subscribe/success (sin session_id)", ruta: () => "/subscribe/success", cuenta: "historia" },
  { nombre: "/referral", ruta: () => "/referral", cuenta: "historia" },
  { nombre: "/settings", ruta: () => "/settings", cuenta: "historia" },

  // ---- signed in: empty states (new account) --------------------------------
  { nombre: "/dashboard (vacío)", ruta: () => "/dashboard", cuenta: "nuevo" },
  { nombre: "/reading/new (vacío)", ruta: () => "/reading/new", cuenta: "nuevo" },
  { nombre: "/history (vacío)", ruta: () => "/history", cuenta: "nuevo" },
  { nombre: "/history/insights (vacío)", ruta: () => "/history/insights", cuenta: "nuevo" },
  { nombre: "/daily (vacío)", ruta: () => "/daily", cuenta: "nuevo" },
  { nombre: "/blueprint (vacío)", ruta: () => "/blueprint", cuenta: "nuevo" },
  { nombre: "/compatibility (vacío)", ruta: () => "/compatibility", cuenta: "nuevo" },
  { nombre: "/collection (vacío)", ruta: () => "/collection", cuenta: "nuevo" },
];

/**
 * Known defects of today's UI (measured 5 Nov 2026 on the five widths, es and en, Chromium
 * and WebKit; re-measured after the Fase 1 integration with ARCANA_E2E_DEFECTOS=0), by route
 * label and check. Each one is a test.fixme with its reason and the lot that owns the screen;
 * that lot deletes the entry when it fixes it (Fase 2) and the integrator checks that this
 * table ends up empty.
 */
const PROGRESO_404 = {
  patron: /status of 404 .* @ \/progress\?/,
  motivo: "L3 · LevelWidget enlaza a /progress, que no existe: el prefetch da 404 en consola",
};

const DEFECTOS: Record<string, Defectos> = {
  "/share/[shareId]": {
    maqueta: [
      {
        motivo:
          "L2 · la fila de sellos (tirada, «Compartido por», fecha) no tiene flex-wrap: con los Badge nuevos (mono en mayúsculas) se sale a 390 y 360",
        anchos: [390, 360],
      },
    ],
    sinjs: [
      {
        motivo: "L2 · la misma fila de sellos sin flex-wrap se sale a 390 y 360 también sin JS",
        anchos: [390, 360],
      },
    ],
  },
  "/dashboard": { consola: [PROGRESO_404] },
  "/reading/[id]": {
    maqueta: [
      {
        motivo:
          "L2 · la fila final «Hacer otra lectura» · compartir · «Ver historial» (flex sin wrap, <Link><Button/></Link>) no cabe a 390 y 360 con los botones nuevos en mono",
        anchos: [390, 360],
      },
    ],
  },
  "/dashboard (vacío)": { consola: [PROGRESO_404] },
  "/reading/new (vacío)": {
    maqueta: [
      {
        motivo:
          "L2 · los sellos «3 lecturas gratis» y «0 créditos disponibles» (Badge con text-sm) en una fila sin flex-wrap se salen a 390 y 360",
        anchos: [390, 360],
      },
    ],
  },
};

for (const nombre of Object.keys(DEFECTOS)) {
  if (!RUTAS.some((r) => r.nombre === nombre)) throw new Error(`DEFECTOS names a route that is not in RUTAS: ${nombre}`);
}
/**
 * ARCANA_E2E_DEFECTOS=0 ignores the table (no fixme, no filtered console errors): the
 * integrator's way to see which entries a lot already fixed and must be deleted.
 */
const IGNORAR_DEFECTOS = process.env.ARCANA_E2E_DEFECTOS === "0";
for (const r of RUTAS) r.defectos = IGNORAR_DEFECTOS ? {} : (DEFECTOS[r.nombre] ?? {});

// ---------------------------------------------------------------------------

function anchoDe(testInfo: TestInfo): number {
  return testInfo.project.use.viewport?.width ?? 0;
}

/** Marks the running test as fixme if the route has a known defect for this check. */
function defectoConocido(r: Ruta, chequeo: Chequeo, testInfo: TestInfo, idioma: "es" | "en") {
  const ancho = anchoDe(testInfo);
  const motor = testInfo.project.name.startsWith("webkit") ? "webkit" : "chromium";
  for (const d of r.defectos?.[chequeo] ?? []) {
    const aplica =
      (!d.anchos || d.anchos.includes(ancho)) && (!d.idioma || d.idioma === idioma) && (!d.motor || d.motor === motor);
    test.fixme(aplica, d.motivo);
  }
}

async function revisarMaqueta(page: import("@playwright/test").Page, r: Ruta, testInfo: TestInfo) {
  const conocidos = r.defectos?.consola ?? [];
  for (const { motivo } of conocidos) testInfo.annotations.push({ type: "defecto conocido (consola)", description: motivo });
  const errores = vigilarConsola(page, {
    documento404: r.status === 404 ? r.ruta() : null,
    conocidos: conocidos.map((c) => c.patron),
  });
  const respuesta = await cargar(page, r.ruta());
  expect(respuesta?.status(), "status").toBe(r.status ?? 200);
  if (r.cuenta) expect(new URL(page.url()).pathname, "the session must not bounce to /login").not.toBe("/login");

  await recorrer(page);
  const m = await medirMaqueta(page);
  expect.soft(m.scrollHorizontal, "horizontal scroll (px)").toBe(0);
  expect.soft(m.fueraDePantalla, "elements off screen (no scroller, no data-recorta, not decorative)").toEqual([]);
  expect.soft(m.imagenesRotas, "images that did not load").toEqual([]);
  expect.soft(errores, "console errors").toEqual([]);
}

async function revisarEncabezados(page: import("@playwright/test").Page, r: Ruta) {
  await cargar(page, r.ruta());
  await expect(page.getByRole("heading", { level: 1 }), "exactly one h1").toHaveCount(1);

  const arbol = await page.locator("body").ariaSnapshot();
  expect(arbol, "the accessibility tree keeps the h1").toMatch(/- heading .*\[level=1\]/);

  const escondidos = await page.evaluate(() =>
    [...document.querySelectorAll("h1, h2, h3, h4, h5, h6")]
      .filter((h) => h.getBoundingClientRect().width > 0 && getComputedStyle(h).visibility !== "hidden")
      .filter((h) => h.closest("[aria-hidden='true']") || (h.getAttribute("role") ?? "heading") !== "heading")
      .map((h) => `${h.tagName.toLowerCase()} «${(h.textContent ?? "").trim().slice(0, 40)}»`)
  );
  expect(escondidos, "visible headings hidden from the accessibility tree").toEqual([]);
}

for (const r of RUTAS) {
  const publica = r.cuenta === null;

  test.describe(r.nombre, { tag: publica ? ["@publica"] : [] }, () => {
    test.use({ cuenta: r.cuenta });

    test("maqueta", async ({ page }, testInfo) => {
      defectoConocido(r, "maqueta", testInfo, "es");
      await revisarMaqueta(page, r, testInfo);
    });

    test("encabezados", async ({ page }, testInfo) => {
      defectoConocido(r, "encabezados", testInfo, "es");
      await revisarEncabezados(page, r);
    });

    test.describe("movimiento reducido", () => {
      test.use({ contextOptions: { reducedMotion: "reduce" } });

      test("nada se queda animando ni oculto", async ({ page }, testInfo) => {
        defectoConocido(r, "reducido", testInfo, "es");
        const respuesta = await cargar(page, r.ruta());
        expect(respuesta?.status(), "status").toBe(r.status ?? 200);
        expect.soft(await animacionesCorriendo(page), "animations running with prefers-reduced-motion").toEqual([]);
        expect.soft(await revelarSinMostrar(page), ".revelar / [data-revelar] still faded").toEqual([]);
      });
    });

    if (publica) {
      test.describe("sin JS", () => {
        test.use({ javaScriptEnabled: false });

        test("el contenido está completo y visible", async ({ page }, testInfo) => {
          defectoConocido(r, "sinjs", testInfo, "es");
          const respuesta = await page.goto(r.ruta(), { waitUntil: "load" });
          expect(respuesta?.status(), "status").toBe(r.status ?? 200);
          // The content is in the server HTML (how many h1 is the "encabezados" check's business)
          await expect(page.getByRole("heading").first(), "headings rendered without JS").toBeVisible();
          expect.soft(await textoInvisible(page), "text that stays invisible without JS").toEqual([]);
          const m = await medirMaqueta(page);
          expect.soft(m.scrollHorizontal, "horizontal scroll without JS (px)").toBe(0);
          expect.soft(m.fueraDePantalla, "elements off screen without JS").toEqual([]);
        });
      });
    }

    // English at 390 only (the projects pick @en; see playwright.config.ts).
    test.describe("en inglés", { tag: "@en" }, () => {
      test.use({ locale: "en-US" });

      test("maqueta", async ({ page }, testInfo) => {
        defectoConocido(r, "maqueta", testInfo, "en");
        await revisarMaqueta(page, r, testInfo);
      });

      test("encabezados", async ({ page }, testInfo) => {
        defectoConocido(r, "encabezados", testInfo, "en");
        await revisarEncabezados(page, r);
      });
    });
  });
}
