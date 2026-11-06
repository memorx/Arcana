// Banco de pruebas de los componentes firma («Dos tintas»), fuera del build de Next.
//
//   node scripts/tinta-banco.mjs [--salida DIR]
//
// 1. Empaqueta con esbuild los componentes reales (src/components/tinta, src/components/ui/TarotCard) con React de
//    producción; next-intl y next/image se sustituyen por calzas mínimas.
// 2. Compila Tailwind 4 con los tokens del plan §2.1 (los que pondrá F1-A en globals.css) para que TarotCard se vea
//    como se verá integrado.
// 3. Sirve el banco y public/ en un puerto libre y lo abre en Chrome (puppeteer-core del proyecto lant):
//    - rendimiento: 10 cartas quemándose con la CPU a ×4 (Emulation.setCPUThrottlingRate): tareas largas, duración de
//      cada quema y total; y 3 cartas (sin cola).
//    - capturas: CartaQuemable a media quema, MesaDeGrabados a 1440 y 390, TarotCard, GrabadoParticulas.
// Escribe informe.json y las capturas en --salida (por omisión, una carpeta temporal).
import { createRequire } from "node:module";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";

const require = createRequire("file:///C:/Users/guill/dev/lant/package.json");
const puppeteer = require("puppeteer-core");
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const i = process.argv.indexOf("--salida");
const SALIDA = i > 0 ? path.resolve(process.argv[i + 1]) : fs.mkdtempSync(path.join(os.tmpdir(), "tinta-banco-"));
const OBRA = path.join(SALIDA, "banco");
fs.mkdirSync(OBRA, { recursive: true });

const mensajes = JSON.parse(fs.readFileSync(path.join(RAIZ, "messages/es.json"), "utf8"));

// ---------------------------------------------------------------------------------------------------------------------
// 1. El banco (React)
// ---------------------------------------------------------------------------------------------------------------------
const ENTRADA = `
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { CartaQuemable } from "@/components/tinta/CartaQuemable";
import { MesaDeGrabados } from "@/components/tinta/MesaDeGrabados";
import { GrabadoParticulas } from "@/components/tinta/GrabadoParticulas";
import { TarotCard, TarotCardStatic } from "@/components/ui/TarotCard";
import { CardPlaceholder } from "@/components/ui/CardPlaceholder";
import { CARTAS } from "@/lib/cartas";

const q = new URLSearchParams(location.search);
const vista = q.get("vista") || "quema";

function Quema() {
  const n = Number(q.get("n") || 10);
  const tam = q.get("tam") || "media";
  const [rev, setRev] = useState(false);
  window.voltearTodas = () => setRev(true);
  const cartas = CARTAS.filter((_, i) => i % 7 === 0).concat(CARTAS).slice(0, n);
  return (
    <div className="banco-quema" style={{ "--cq-ancho": tam === "grande" ? "300px" : "180px" }}>
      {cartas.map((c, i) => (
        <CartaQuemable key={c.slug} carta={{ nombre: c.name, slug: c.slug }} etiqueta={"Voltear la carta " + (i + 1)}
          revelada={rev} tamano={tam} invertida={i === 1} prioridad
          onRevelada={() => (window.reveladas = (window.reveladas || 0) + 1)} />
      ))}
    </div>
  );
}

function Mesa() {
  const slugs = CARTAS.filter((_, i) => i % 2 === 0).map((c) => c.slug);
  return (
    <section className="banco-mesa">
      <MesaDeGrabados slugs={slugs} />
      <div className="banco-velo" />
      <div className="banco-mesa-texto">
        <p className="font-pincel text-rosa" style={{ fontSize: "clamp(5rem, 3rem + 10vw, 12rem)", lineHeight: .9 }}>Pregunta</p>
        <h1 className="font-titulo text-papel" style={{ fontSize: "clamp(1.6rem, 1.1rem + 1.6vw, 2.6rem)", lineHeight: 1.12, maxWidth: "19ch" }}>
          Las cartas son de 1909. Quien las lee hoy es una IA. <span className="text-rosa">La pregunta sigue siendo tuya.</span>
        </h1>
      </div>
    </section>
  );
}

function Tarot() {
  const c = (name, nameEs, arcana, suit, number) => ({ name, nameEs, arcana, suit, number, imageUrl: null });
  return (
    <div className="bg-papel text-tinta p-8 grid gap-10">
      <div className="flex flex-wrap items-end gap-8">
        <TarotCardStatic card={c("The Lovers", "Los Enamorados", "MAJOR", null, 6)} size="lg" />
        <TarotCardStatic card={c("Two of Cups", "Dos de Copas", "MINOR", "CUPS", 2)} size="lg" isReversed />
        <TarotCardStatic card={c("The Star", "La Estrella", "MAJOR", null, 17)} size="lg" isGolden />
        <TarotCard card={c("The Hermit", "El Ermitaño", "MAJOR", null, 9)} size="lg" isRevealed={false} />
        <TarotCardStatic card={c("The Sun", "El Sol", "MAJOR", null, 19)} size="md" />
        <TarotCardStatic card={c("Ace of Wands", "As de Bastos", "MINOR", "WANDS", 1)} size="sm" />
      </div>
      <div className="flex flex-wrap items-end gap-6">
        <CardPlaceholder cardName="El Comodín" arcana="MAJOR" suit={null} number={0} className="w-[120px] h-[206px]" />
        <CardPlaceholder cardName="Rey de Oros" arcana="MINOR" suit="PENTACLES" number={14} className="w-[120px] h-[206px]" />
        <CardPlaceholder cardName="Tres de Copas" arcana="MINOR" suit="CUPS" number={3} className="w-20 h-[137px]" />
        <CardPlaceholder cardName="Sota de Espadas" arcana="MINOR" suit="SWORDS" number={11} className="w-20 h-[137px]" />
        <CardPlaceholder cardName="Caballo de Bastos" arcana="MINOR" suit="WANDS" number={12} className="w-20 h-[137px]" />
      </div>
    </div>
  );
}

function Particulas() {
  return (
    <div className="bg-papel text-tinta">
      <div style={{ height: "60vh" }} />
      <GrabadoParticulas carta={{ slug: "rws-tarot-00-fool" }} firma="Lectura de ejemplo · Arcana" alt="El Loco, grabado de 1909"
        texto={["El Loco abre tu lectura con un paso al vacío que no es descuido: es confianza. Tu pregunta habla de empezar algo sin tener el mapa completo.",
                "Esta carta no te promete que saldrá bien; te pregunta qué cargas en ese hatillo que ya no necesitas llevar."]}>
        <p className="font-dato text-xs uppercase tracking-[0.12em] text-grafito">Del grabado a la IA</p>
        <h2 className="font-titulo" style={{ fontSize: "clamp(2rem, 1.3rem + 2.4vw, 3.4rem)", lineHeight: 1.05 }}>Un grabado de 1909 se vuelve una lectura escrita para ti.</h2>
      </GrabadoParticulas>
      <div style={{ height: "60vh" }} />
    </div>
  );
}

const VISTAS = { quema: Quema, mesa: Mesa, tarot: Tarot, particulas: Particulas };
const Vista = VISTAS[vista];
createRoot(document.getElementById("raiz")).render(<Vista />);
`;

const calzas = {
  name: "calzas",
  setup(b) {
    b.onResolve({ filter: /^next-intl$/ }, () => ({ path: "next-intl", namespace: "calza" }));
    b.onResolve({ filter: /^next\/image$/ }, () => ({ path: "next/image", namespace: "calza" }));
    b.onLoad({ filter: /^next-intl$/, namespace: "calza" }, () => ({
      loader: "js",
      contents: `const M = ${JSON.stringify(mensajes)};
        export const useLocale = () => "es";
        export const useTranslations = (ns) => (k) => (M[ns] && M[ns][k]) || k;`,
    }));
    b.onLoad({ filter: /^next\/image$/, namespace: "calza" }, () => ({
      loader: "jsx",
      resolveDir: RAIZ,
      contents: `import { createElement } from "react";
        export default function Image({ fill, unoptimized, sizes, priority, ...p }) {
          return createElement("img", { ...p, style: fill ? { position: "absolute", inset: 0, width: "100%", height: "100%" } : undefined });
        }`,
    }));
  },
};

await esbuild.build({
  stdin: { contents: ENTRADA, loader: "tsx", resolveDir: RAIZ, sourcefile: "banco.tsx" },
  bundle: true,
  minify: true,
  format: "esm",
  jsx: "automatic",
  outfile: path.join(OBRA, "banco.js"),
  define: { "process.env.NODE_ENV": '"production"' },
  tsconfig: path.join(RAIZ, "tsconfig.json"),
  plugins: [calzas],
  logLevel: "warning",
});
// En la app tinta.css entra una sola vez desde globals.css (ningún componente lo importa); aquí se sirve como banco.css.
fs.copyFileSync(path.join(RAIZ, "src/components/tinta/tinta.css"), path.join(OBRA, "banco.css"));

// ---------------------------------------------------------------------------------------------------------------------
// 2. Tailwind con los tokens de §2.1
// ---------------------------------------------------------------------------------------------------------------------
const fuenteTw = `
@import "tailwindcss";
@source "${path.join(RAIZ, "src/components").replace(/\\/g, "/")}";
@source "${path.join(OBRA, "banco.js").replace(/\\/g, "/")}";
@theme {
  --color-tinta: #0E0D0C; --color-papel: #ECEAE6; --color-papel-hondo: #E2DFD9; --color-grafito: #55524D;
  --color-niebla: #A8A49D; --color-rosa: #E4007C; --color-rosa-texto: #B10061; --color-rosa-luz: #F43D97; --color-brasa: #FF6BB5;
  --font-titulo: "Gloock", Georgia, serif; --font-lectura: "Newsreader", Georgia, serif;
  --font-dato: "Martian Mono", ui-monospace, monospace; --font-pincel: "Water Brush", cursive;
}
body { margin: 0; background: var(--color-papel); color: var(--color-tinta); font-family: var(--font-lectura); }
.banco-quema { display: grid; grid-template-columns: repeat(auto-fill, var(--cq-ancho)); gap: 18px; padding: 24px; background: var(--color-tinta); min-height: 100vh; align-content: start; }
.banco-mesa { position: relative; min-height: 100svh; overflow: clip; background: var(--color-tinta); display: grid; align-items: end; }
.banco-velo { position: absolute; inset: 0; pointer-events: none; background: linear-gradient(90deg, rgb(14 13 12 / .96) 0%, rgb(14 13 12 / .86) 38%, rgb(14 13 12 / .25) 72%, rgb(14 13 12 / .45) 100%), linear-gradient(0deg, rgb(14 13 12 / .9) 0%, transparent 40%); }
@media (max-width: 720px) { .banco-velo { background: linear-gradient(180deg, rgb(14 13 12 / .15) 0%, rgb(14 13 12 / .55) 30%, rgb(14 13 12 / .94) 55%, rgb(14 13 12 / .98) 100%); } }
.banco-mesa-texto { position: relative; z-index: 2; padding: 140px clamp(16px, 4vw, 56px) 64px; display: grid; gap: 24px; }
`;
const css = await postcss([tailwind({ base: RAIZ })]).process(fuenteTw, { from: path.join(RAIZ, "banco-tw.css") }) // «from» en la raíz: resuelve tailwindcss en node_modules;
fs.writeFileSync(path.join(OBRA, "tw.css"), css.css);
fs.writeFileSync(
  path.join(OBRA, "index.html"),
  `<!doctype html><html lang="es-MX"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="icon" href="/favicon.svg">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Gloock&family=Martian+Mono:wght@400;500&family=Newsreader:ital,opsz,wght@0,6..72,400;1,6..72,400&family=Water+Brush&display=swap">
<link rel="stylesheet" href="/banco/tw.css"><link rel="stylesheet" href="/banco/banco.css"></head>
<body><div id="raiz"></div><script type="module" src="/banco/banco.js"></script></body></html>`,
);

// ---------------------------------------------------------------------------------------------------------------------
// 3. Servidor y Chrome
// ---------------------------------------------------------------------------------------------------------------------
const TIPOS = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".webp": "image/webp", ".json": "application/json" };
const srv = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  const ruta = url === "/" ? path.join(OBRA, "index.html") : url.startsWith("/banco/") ? path.join(SALIDA, url) : path.join(RAIZ, "public", url);
  fs.readFile(ruta, (err, buf) => {
    if (err) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "content-type": TIPOS[path.extname(ruta)] || "application/octet-stream" });
    res.end(buf);
  });
});
await new Promise((r) => srv.listen(0, "127.0.0.1", r));
const BASE = `http://127.0.0.1:${srv.address().port}/`;
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const navegador = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--hide-scrollbars"] });
const informe = { salida: SALIDA };

// Chrome headless levanta su rasterizador por software (SwiftShader) con el PRIMER lienzo 2D del navegador: ~9.6 s
// aunque la CPU no esté acelerada (17 ms en la segunda pestaña, 326 ms con --disable-software-rasterizer). Un
// navegador real con GPU ya lo tiene listo, así que se calienta una vez en una pestaña aparte antes de medir.
{
  const calentar = await navegador.newPage();
  await calentar.goto(BASE + "?vista=tarot", { waitUntil: "load" });
  informe.arranque_lienzo_headless_ms = await calentar.evaluate(() => {
    const t = performance.now();
    for (const opciones of [{ willReadFrequently: true }, {}]) {
      const x = document.createElement("canvas").getContext("2d", opciones);
      x.fillRect(0, 0, 4, 4);
      x.getImageData(0, 0, 1, 1);
    }
    return Math.round(performance.now() - t);
  });
  await calentar.close();
}

async function abrir(query, ancho, alto, { lento = false } = {}) {
  const p = await navegador.newPage();
  const errores = [];
  p.on("console", (m) => m.type() === "error" && errores.push(m.text()));
  p.on("pageerror", (e) => errores.push(String(e)));
  await p.setViewport({ width: ancho, height: alto });
  await p.evaluateOnNewDocument(() => {
    window.__tareas = [];
    new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__tareas.push({ inicio: e.startTime, dur: e.duration }))).observe({ type: "longtask", buffered: true });
    window.__estados = [];
    new MutationObserver((ms) => ms.forEach((m) => m.attributeName === "data-estado" &&
      window.__estados.push({ t: performance.now(), i: [...document.querySelectorAll(".cq")].indexOf(m.target), e: m.target.dataset.estado })))
      .observe(document, { subtree: true, attributes: true, attributeFilter: ["data-estado"] });
  });
  await p.goto(BASE + "?" + query, { waitUntil: "networkidle0", timeout: 60000 });
  await p.evaluate(() => document.fonts.ready);
  // Espera las imágenes que se piden (las perezosas fuera de pantalla nunca llegan: tope de 5 s).
  await p.evaluate(() => Promise.race([
    Promise.all([...document.images].map((im) => (im.complete ? 0 : new Promise((r) => (im.onload = im.onerror = r))))),
    new Promise((r) => setTimeout(r, 5000)),
  ]));
  if (lento) {
    const cdp = await p.createCDPSession();
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  }
  await dormir(300);
  return { p, errores };
}

async function medirQuema(n) {
  const { p, errores } = await abrir(`vista=quema&n=${n}`, 1440, 900, { lento: true });
  await p.evaluate(() => { window.__tareas = []; window.__estados = []; window.__t0 = performance.now(); window.voltearTodas(); });
  await p.waitForFunction((n) => (window.reveladas || 0) >= n, { timeout: 20000, polling: 50 }, n);
  const r = await p.evaluate(() => {
    const t0 = window.__t0;
    const porCarta = {};
    for (const s of window.__estados) {
      porCarta[s.i] ??= {};
      if (s.e === "quemando") porCarta[s.i].inicio = s.t;
      if (s.e === "revelada") porCarta[s.i].fin = s.t;
    }
    const quemas = Object.values(porCarta).map((c) => c.fin - c.inicio);
    const fin = Math.max(...Object.values(porCarta).map((c) => c.fin));
    const tareas = window.__tareas.filter((t) => t.inicio >= t0 - 5);
    let simultaneas = 0, max = 0;
    for (const s of [...window.__estados].sort((a, b) => a.t - b.t)) {
      if (s.e === "quemando") max = Math.max(max, ++simultaneas);
      if (s.e === "revelada") simultaneas--;
    }
    return {
      total_ms: Math.round(fin - t0),
      quema_max_ms: Math.round(Math.max(...quemas)),
      quema_min_ms: Math.round(Math.min(...quemas)),
      simultaneas_max: max,
      tareas_largas: tareas.length,
      tarea_larga_max_ms: Math.round(Math.max(0, ...tareas.map((t) => t.dur))),
    };
  });
  await p.close();
  return { ...r, errores };
}

console.error("· rendimiento: 10, 3 y 12 cartas con CPU ×4");
// Cada escenario corre 3 veces; se informa la peor corrida de cada medida.
async function peorDe(n, veces = 3) {
  const corridas = [];
  for (let k = 0; k < veces; k++) corridas.push(await medirQuema(n));
  const peor = (c) => Math.max(...corridas.map((r) => r[c]));
  return {
    corridas: corridas.length,
    total_ms: peor("total_ms"),
    quema_max_ms: peor("quema_max_ms"),
    quema_min_ms: Math.min(...corridas.map((r) => r.quema_min_ms)),
    simultaneas_max: peor("simultaneas_max"),
    tarea_larga_max_ms: peor("tarea_larga_max_ms"),
    tareas_largas_por_corrida: corridas.map((r) => r.tareas_largas),
    errores: corridas.flatMap((r) => r.errores),
  };
}
informe.quema_10_cpu4 = await peorDe(10);
informe.quema_3_cpu4 = await peorDe(3);
informe.quema_12_cpu4 = await peorDe(12);

console.error("· capturas");
// Captura a media quema (tamaño grande, sin acelerar la CPU)
{
  const { p, errores } = await abrir("vista=quema&n=3&tam=grande", 1100, 640);
  await p.screenshot({ path: path.join(SALIDA, "quema-0-boca-abajo.jpg"), type: "jpeg", quality: 80 });
  await p.evaluate(() => window.voltearTodas());
  await dormir(650);
  await p.screenshot({ path: path.join(SALIDA, "quema-1-media.jpg"), type: "jpeg", quality: 80 });
  await dormir(2000);
  await p.screenshot({ path: path.join(SALIDA, "quema-2-revelada.jpg"), type: "jpeg", quality: 80 });
  informe.captura_quema_errores = errores;
  await p.close();
}

for (const [ancho, alto] of [[1440, 900], [390, 844]]) {
  const { p, errores } = await abrir("vista=mesa", ancho, alto);
  await dormir(500);
  await p.screenshot({ path: path.join(SALIDA, `mesa-${ancho}.jpg`), type: "jpeg", quality: 80 });
  informe[`mesa_${ancho}`] = await p.evaluate(() => ({
    columnas_visibles: [...document.querySelectorAll(".mdg-columna")].filter((c) => getComputedStyle(c).display !== "none").length,
    imgs_pedidas: performance.getEntriesByType("resource").filter((r) => r.name.includes("-mesa.webp")).length,
    filtros: [...document.querySelectorAll(".mdg *")].filter((e) => getComputedStyle(e).filter !== "none").length,
    scroll_horizontal: document.documentElement.scrollWidth > innerWidth,
    errores: 0,
  }));
  informe[`mesa_${ancho}`].errores = errores;
  await p.close();
}

for (const [ancho, alto] of [[1440, 900], [390, 844]]) {
  const { p, errores } = await abrir("vista=tarot", ancho, alto);
  await p.screenshot({ path: path.join(SALIDA, `tarot-${ancho}.jpg`), type: "jpeg", quality: 85, fullPage: true });
  informe[`tarot_${ancho}`] = { errores, scroll_horizontal: await p.evaluate(() => document.documentElement.scrollWidth > innerWidth) };
  await p.close();
}

{
  const { p, errores } = await abrir("vista=particulas", 1440, 900);
  const caja = await p.evaluate(() => { const r = document.querySelector(".gp").getBoundingClientRect(); return { top: r.top + scrollY, alto: r.height }; });
  for (const [k, f] of [["a", 0.05], ["b", 0.4], ["c", 0.62], ["d", 0.98]]) {
    await p.evaluate((y) => scrollTo(0, y), caja.top + (caja.alto - 900) * f);
    await dormir(400);
    await p.screenshot({ path: path.join(SALIDA, `particulas-${k}.jpg`), type: "jpeg", quality: 80 });
  }
  informe.particulas = { errores, activa: await p.evaluate(() => document.querySelector(".gp").classList.contains("gp--activa")) };
  await p.close();
}

{
  const { p, errores } = await abrir("vista=particulas", 390, 844);
  await p.evaluate(() => document.querySelector(".gp").scrollIntoView());
  await dormir(300);
  await p.screenshot({ path: path.join(SALIDA, "particulas-390.jpg"), type: "jpeg", quality: 80 });
  informe.particulas_390 = {
    errores,
    activa: await p.evaluate(() => document.querySelector(".gp").classList.contains("gp--activa")),
    scroll_horizontal: await p.evaluate(() => document.documentElement.scrollWidth > innerWidth),
  };
  await p.close();
}

// Sin JavaScript: el HTML de las cartas boca abajo (como sale del servidor) con JS apagado. La carta debe verse
// revelada: @media (scripting: none) esconde la tapa y la pista. Se lee el estilo calculado por CDP (sin JS de página).
{
  const { p } = await abrir("vista=quema&n=3&tam=grande", 1100, 640);
  const marcado = await p.evaluate(() => document.querySelector(".banco-quema").outerHTML);
  await p.close();
  fs.writeFileSync(path.join(OBRA, "sinjs.html"), `<!doctype html><html lang="es-MX"><head><meta charset="utf-8">
<link rel="stylesheet" href="/banco/tw.css"><link rel="stylesheet" href="/banco/banco.css"></head><body>${marcado}</body></html>`);
  const q = await navegador.newPage();
  await q.setJavaScriptEnabled(false);
  await q.setViewport({ width: 1100, height: 640 });
  await q.goto(BASE + "banco/sinjs.html", { waitUntil: "networkidle0" });
  await q.screenshot({ path: path.join(SALIDA, "sin-js.jpg"), type: "jpeg", quality: 80 });
  const cdp = await q.createCDPSession();
  await cdp.send("DOM.enable");
  await cdp.send("CSS.enable");
  const { root } = await cdp.send("DOM.getDocument");
  const estilo = async (sel) => {
    const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: root.nodeId, selector: sel });
    const { computedStyle } = await cdp.send("CSS.getComputedStyleForNode", { nodeId });
    return computedStyle.find((c) => c.name === "display")?.value;
  };
  informe.sin_js = { tapa_display: await estilo(".cq-tapa"), pista_display: await estilo(".cq-pista"), cara_display: await estilo(".cq-cara") };
  await q.close();
}

await navegador.close();
srv.close();
fs.writeFileSync(path.join(SALIDA, "informe.json"), JSON.stringify(informe, null, 2));
console.log(JSON.stringify(informe, null, 2));
