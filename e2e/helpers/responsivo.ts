/**
 * Measurements of the responsive pass (PLAN 2026-11-05 §2.4). Each one runs inside
 * the page and returns plain data, so a failing assertion says exactly what broke.
 */
import type { Page, Response } from "@playwright/test";

/**
 * Loads a route and lets it settle: network quiet (or 6 s), fonts ready, a short pause.
 * Then makes sure the page has painted: on a loaded machine, headless Chromium sometimes
 * never paints the first page of a freshly launched browser (no first-paint entry, no
 * requestAnimationFrame, document.timeline stuck at 0, so every CSS animation stays
 * "pending"), even for a bare setContent page. A screenshot forces that first frame.
 */
export async function cargar(page: Page, ruta: string): Promise<Response | null> {
  const respuesta = await page.goto(ruta, { waitUntil: "load" });
  await page.waitForLoadState("networkidle", { timeout: 6_000 }).catch(() => undefined);
  await page.evaluate(() => document.fonts?.ready).catch(() => undefined);
  const pinto = await page
    .evaluate(() => performance.getEntriesByType("paint").length > 0)
    .catch(() => true);
  if (!pinto) await page.screenshot({ timeout: 15_000 }).catch(() => undefined);
  await page.waitForTimeout(400);
  return respuesta;
}

/**
 * Makes every image load: native lazy images switch to eager, then the page is scrolled
 * in viewport steps (for observer-driven lazy loading) and back to the top.
 */
export async function recorrer(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const pausa = (ms: number) => new Promise((r) => setTimeout(r, ms));
    document.querySelectorAll<HTMLImageElement>('img[loading="lazy"]').forEach((img) => {
      img.loading = "eager";
    });
    const alto = () => document.documentElement.scrollHeight;
    for (let y = 0; y < alto(); y += Math.max(200, window.innerHeight * 0.8)) {
      window.scrollTo(0, y);
      await pausa(60);
    }
    window.scrollTo(0, alto());
    await pausa(150);
    window.scrollTo(0, 0);
  });
  await page
    .waitForFunction(
      () =>
        [...document.images].every((img) => {
          const r = img.getBoundingClientRect();
          return r.width === 0 || r.height === 0 || img.complete;
        }),
      undefined,
      { timeout: 10_000 }
    )
    .catch(() => undefined);
  await page.waitForTimeout(300);
}

export interface Maqueta {
  /** Pixels the page can actually scroll sideways (0 = none). */
  scrollHorizontal: number;
  /** Outermost rendered elements that stick out of the viewport and no ancestor excuses (see medirMaqueta). */
  fueraDePantalla: string[];
  /** Rendered <img> that did not load (naturalWidth 0). */
  imagenesRotas: string[];
}

/**
 * Horizontal overflow, elements off screen and broken images.
 *
 * An element that sticks out of the viewport is reported unless an ancestor below
 * <body> excuses it:
 * - an ancestor with overflow-x `auto` or `scroll` always excuses it: the content is
 *   reachable by scrolling that box and does not widen the page (note that a vertical
 *   scroller, e.g. `overflow-y: auto`, computes overflow-x to `auto` too);
 * - an ancestor with overflow-x `hidden` or `clip` excuses it ONLY if
 *   (a) the element is decorative: inside `[aria-hidden="true"]`, or an `img[alt=""]`; or
 *   (b) that ancestor opts in with the attribute `data-recorta` (a marquee, a carousel:
 *       a box whose job is to cut what sticks out).
 *   Otherwise a clipped element is a defect: a title or a button cut by an `Escena`
 *   (`overflow: clip`) or a card with `overflow-hidden` is text the user cannot read.
 *   The report then says which ancestor cut it («recortado por …»).
 * - an ancestor that is not rendered (display none, visibility hidden, sr-only clip)
 *   or that was already reported excuses it as well (one report per overflow).
 * <html> and <body> never count as that ancestor: an overflow-x:hidden on the body
 * would otherwise hide any overflow.
 */
export async function medirMaqueta(page: Page): Promise<Maqueta> {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const anchoVista = doc.clientWidth;

    const antesX = window.scrollX;
    window.scrollTo(100_000, window.scrollY);
    const scrollHorizontal = window.scrollX;
    window.scrollTo(antesX, window.scrollY);

    const describir = (el: Element) => {
      const id = el.id ? `#${el.id}` : "";
      const clases =
        typeof el.className === "string" && el.className.trim()
          ? `.${el.className.trim().split(/\s+/).slice(0, 3).join(".")}`
          : "";
      const texto = (el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 40);
      const r = el.getBoundingClientRect();
      return `${el.tagName.toLowerCase()}${id}${clases} [${Math.round(r.left)}→${Math.round(r.right)} de ${anchoVista}]${
        texto ? ` «${texto}»` : ""
      }`;
    };

    const oculto = (cs: CSSStyleDeclaration) =>
      cs.display === "none" ||
      cs.visibility === "hidden" ||
      cs.visibility === "collapse" ||
      cs.clip === "rect(0px, 0px, 0px, 0px)" ||
      /inset\(50%\)/.test(cs.clipPath);

    /** Scrollers: what sticks out of them is reachable by scrolling. */
    const desplazaX = (cs: CSSStyleDeclaration) => /^(auto|scroll)$/.test(cs.overflowX);
    /** Boxes that cut what sticks out: excuse only decoration or a box with data-recorta. */
    const recortaX = (cs: CSSStyleDeclaration) => /^(hidden|clip)$/.test(cs.overflowX);
    const corto = (el: Element) => describir(el).replace(/ «.*$/, "");

    const reportados = new Set<Element>();
    const fueraDePantalla: string[] = [];
    for (const el of document.body.querySelectorAll("*")) {
      if (el.closest("svg") && el.tagName.toLowerCase() !== "svg") continue;
      const r = el.getBoundingClientRect();
      if (r.width <= 1 || r.height <= 1) continue;
      if (r.left >= -1 && r.right <= anchoVista + 1) continue;
      const cs = getComputedStyle(el);
      if (oculto(cs)) continue;

      const decorativo = !!el.closest('[aria-hidden="true"]') || el.matches('img[alt=""]');
      let excusado = false;
      let recortadoPor: Element | null = null;
      for (let a = el.parentElement; a && a !== document.body && a !== doc; a = a.parentElement) {
        if (reportados.has(a)) {
          excusado = true;
          break;
        }
        const acs = getComputedStyle(a);
        if (oculto(acs) || desplazaX(acs)) {
          excusado = true;
          break;
        }
        if (recortaX(acs)) {
          if (decorativo || a.hasAttribute("data-recorta")) {
            excusado = true;
            break;
          }
          recortadoPor ??= a;
        }
      }
      if (excusado) continue;
      reportados.add(el);
      fueraDePantalla.push(`${describir(el)}${recortadoPor ? ` (recortado por ${corto(recortadoPor)})` : ""}`);
    }

    const imagenesRotas = [...document.images]
      .filter((img) => {
        const r = img.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return false;
        if (getComputedStyle(img).visibility === "hidden") return false;
        return !(img.complete && img.naturalWidth > 0);
      })
      .map((img) => img.currentSrc || img.src || "(sin src)");

    return { scrollHorizontal, fueraDePantalla: fueraDePantalla.slice(0, 12), imagenesRotas };
  });
}

/** Running animations (CSS animations, transitions and WAAPI) once the page settled. */
export async function animacionesCorriendo(page: Page): Promise<string[]> {
  // Finite ones get a moment to end; whatever still runs after that is a loop or a long one.
  await page
    .waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running"), undefined, {
      timeout: 3_000,
    })
    .catch(() => undefined);
  return page.evaluate(() =>
    document
      .getAnimations()
      .filter((a) => a.playState === "running")
      .slice(0, 10)
      .map((a) => {
        const target = (a.effect as KeyframeEffect | null)?.target;
        const nombre =
          (a as CSSAnimation).animationName ?? (a as CSSTransition).transitionProperty ?? a.constructor.name;
        const sitio = target
          ? `${target.tagName.toLowerCase()}${
              typeof target.className === "string" && target.className.trim()
                ? `.${target.className.trim().split(/\s+/).slice(0, 3).join(".")}`
                : ""
            }`
          : "?";
        return `${nombre} en ${sitio}`;
      })
  );
}

/** Reveal-on-scroll elements of the redesign that are still faded (they must show with reduced motion). */
export async function revelarSinMostrar(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll(".revelar, [data-revelar]")]
      .filter((el) => parseFloat(getComputedStyle(el).opacity) < 0.99)
      .slice(0, 10)
      .map((el) => `${el.tagName.toLowerCase()} «${(el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 40)}»`)
  );
}

/**
 * Text that is in the HTML but cannot be seen: an element with its own text whose
 * effective opacity (its own times its ancestors') is under 0.1. Without JS this is
 * content an entrance animation never revealed.
 */
export async function textoInvisible(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const salida: string[] = [];
    const opacidad = new Map<Element, number>();
    const efectiva = (el: Element | null): number => {
      if (!el || el === document.documentElement) return 1;
      const guardada = opacidad.get(el);
      if (guardada !== undefined) return guardada;
      const valor = parseFloat(getComputedStyle(el).opacity) * efectiva(el.parentElement);
      opacidad.set(el, valor);
      return valor;
    };
    for (const el of document.body.querySelectorAll("*")) {
      const propio = [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim());
      if (!propio) continue;
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") continue;
      if (el.closest("[aria-hidden='true'], .sr-only, noscript, script, style")) continue;
      const r = el.getBoundingClientRect();
      if (r.width <= 1 || r.height <= 1) continue;
      if (efectiva(el) < 0.1) {
        salida.push(`${el.tagName.toLowerCase()} «${(el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 40)}»`);
      }
    }
    return salida.slice(0, 10);
  });
}

/**
 * Console errors and uncaught page errors while the test runs. Ignored: favicon noise;
 * when the route is expected to answer 404, the browser's own "Failed to load resource"
 * line for that document; and `conocidos`, known defects listed in responsivo.spec.ts.
 */
export function vigilarConsola(
  page: Page,
  { documento404 = null, conocidos = [] }: { documento404?: string | null; conocidos?: RegExp[] } = {}
): string[] {
  const errores: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const texto = msg.text();
    const origen = msg.location().url ?? "";
    const ruta = origen.replace(/^https?:\/\/localhost:\d+/, "");
    if (/favicon/i.test(texto) || /favicon/i.test(origen)) return;
    if (documento404 && /status of 404/.test(texto) && ruta.split("?")[0] === documento404) return;
    const linea = `${texto.slice(0, 300)}${ruta ? ` @ ${ruta}` : ""}`;
    if (conocidos.some((patron) => patron.test(linea))) return;
    errores.push(linea);
  });
  page.on("pageerror", (error) => errores.push(`pageerror: ${error.message.slice(0, 300)}`));
  return errores;
}
